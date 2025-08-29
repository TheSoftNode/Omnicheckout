import { Router } from 'express'
import axios from 'axios'
import { ethers } from 'ethers'
import { 
  CCTPTransferRequest, 
  CCTPTransferResponse, 
  AttestationResponse, 
  ApiResponse, 
  PaymentStatus,
  SupportedChainId 
} from '../types'
import { getChainConfig, isSolanaChain, FINALITY_THRESHOLDS } from '../config/chains'
import { createLogger } from '../utils/logger'
import { getConfig } from '../config'
import TokenMessengerV2ABI from '../abis/TokenMessengerV2.json'
import MessageTransmitterV2ABI from '../abis/MessageTransmitterV2.json'
import USDCABI from '../abis/USDC.json'

// Solana imports
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  AccountMeta,
  sendAndConfirmTransaction,
  ComputeBudgetProgram
} from '@solana/web3.js'
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError
} from '@solana/spl-token'
import { Program, AnchorProvider, Wallet, BN, utils, web3 } from '@coral-xyz/anchor'
import bs58 from 'bs58'

// CCTP Message structure constants
const MESSAGE_VERSION_OFFSET = 0
const SOURCE_DOMAIN_OFFSET = 4
const DESTINATION_DOMAIN_OFFSET = 8
const NONCE_OFFSET = 12
const SENDER_OFFSET = 20
const RECIPIENT_OFFSET = 52
const DESTINATION_CALLER_OFFSET = 84
const MESSAGE_BODY_OFFSET = 116

// Message body offsets for DepositForBurn
const MESSAGE_VERSION = 0
const BURN_TOKEN_OFFSET = 12
const MINT_RECIPIENT_OFFSET = 44
const AMOUNT_OFFSET = 76
const MESSAGE_SENDER_OFFSET = 84

const router = Router()
const logger = createLogger('CCTPRoutes')
const config = getConfig()

// Solana CCTP V2 Program IDs (Devnet)
const SOLANA_MESSAGE_TRANSMITTER_PROGRAM_ID = new PublicKey('CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC')
const SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID = new PublicKey('CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe')
const SOLANA_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU') // Devnet USDC

// Address conversion utilities
const solanaAddressToHex = (solanaAddress: string): string => {
  return ethers.hexlify(bs58.decode(solanaAddress))
}

const evmAddressToBytes32 = (address: string): string => {
  return `0x000000000000000000000000${address.replace('0x', '')}`
}

const evmAddressToSolanaPublicKey = (addressHex: string): PublicKey => {
  const bytes = ethers.getBytes(evmAddressToBytes32(addressHex))
  return new PublicKey(bytes)
}

// PDA derivation helpers
const deriveTokenMessengerPDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_messenger')],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

const deriveRemoteTokenMessengerPDA = (remoteDomain: number): [PublicKey, number] => {
  const domainBuffer = Buffer.alloc(4)
  domainBuffer.writeUInt32BE(remoteDomain, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('remote_token_messenger'), domainBuffer],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

const deriveTokenMinterPDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_minter')],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

const deriveLocalTokenPDA = (mint: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('local_token'), mint.toBuffer()],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

const deriveTokenPairPDA = (remoteDomain: number, remoteToken: PublicKey): [PublicKey, number] => {
  const domainBuffer = Buffer.alloc(4)
  domainBuffer.writeUInt32BE(remoteDomain, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_pair'), domainBuffer, remoteToken.toBuffer()],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

const deriveCustodyTokenPDA = (mint: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('custody'), mint.toBuffer()],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

const deriveEventAuthorityPDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('__event_authority')],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

// Message parsing utilities for production
const parseMessage = (messageHex: string) => {
  const messageBuffer = Buffer.from(messageHex.startsWith('0x') ? messageHex.slice(2) : messageHex, 'hex')
  
  const version = messageBuffer.readUInt32BE(MESSAGE_VERSION_OFFSET)
  const sourceDomain = messageBuffer.readUInt32BE(SOURCE_DOMAIN_OFFSET)
  const destinationDomain = messageBuffer.readUInt32BE(DESTINATION_DOMAIN_OFFSET)
  const nonce = messageBuffer.readBigUInt64BE(NONCE_OFFSET)
  
  // Extract sender (32 bytes)
  const sender = messageBuffer.slice(SENDER_OFFSET, SENDER_OFFSET + 32)
  
  // Extract recipient (32 bytes) 
  const recipient = messageBuffer.slice(RECIPIENT_OFFSET, RECIPIENT_OFFSET + 32)
  
  // Extract destination caller (32 bytes)
  const destinationCaller = messageBuffer.slice(DESTINATION_CALLER_OFFSET, DESTINATION_CALLER_OFFSET + 32)
  
  // Extract message body
  const messageBody = messageBuffer.slice(MESSAGE_BODY_OFFSET)
  
  return {
    version,
    sourceDomain,
    destinationDomain,
    nonce,
    sender,
    recipient,
    destinationCaller,
    messageBody
  }
}

const parseDepositForBurnMessage = (messageBodyBuffer: Buffer) => {
  const messageBodyVersion = messageBodyBuffer.readUInt32BE(0)
  const burnToken = messageBodyBuffer.slice(BURN_TOKEN_OFFSET, BURN_TOKEN_OFFSET + 32)
  const mintRecipient = messageBodyBuffer.slice(MINT_RECIPIENT_OFFSET, MINT_RECIPIENT_OFFSET + 32)
  const amount = messageBodyBuffer.readBigUInt64BE(AMOUNT_OFFSET)
  const messageSender = messageBodyBuffer.slice(MESSAGE_SENDER_OFFSET, MESSAGE_SENDER_OFFSET + 32)
  
  return {
    messageBodyVersion,
    burnToken,
    mintRecipient,
    amount,
    messageSender
  }
}

// Proper instruction discriminator calculation
const getInstructionDiscriminator = (nameSpace: string, instructionName: string): Buffer => {
  const hash = utils.sha256.hash(`${nameSpace}:${instructionName}`)
  return Buffer.from(hash.slice(0, 8))
}

// Initiate CCTP transfer
router.post('/transfer', async (req, res, next) => {
  try {
    const transferRequest: CCTPTransferRequest = req.body

    const {
      sourceChain,
      destinationChain,
      amount,
      sourceAddress,
      destinationAddress,
      transferType = 'fast',
      sessionId,
      hookData
    } = transferRequest

    // Validate inputs
    if (!sourceChain || !destinationChain || !amount || !sourceAddress || !destinationAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        timestamp: new Date().toISOString()
      })
    }

    // Validate chains
    if (!Object.values(SupportedChainId).includes(sourceChain) || 
        !Object.values(SupportedChainId).includes(destinationChain)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported chain',
        timestamp: new Date().toISOString()
      })
    }

    if (sourceChain === destinationChain) {
      return res.status(400).json({
        success: false,
        error: 'Source and destination chains must be different',
        timestamp: new Date().toISOString()
      })
    }

    // Validate amount
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        timestamp: new Date().toISOString()
      })
    }

    logger.info('Initiating CCTP transfer', { 
      sourceChain, 
      destinationChain, 
      amount, 
      transferType,
      sessionId 
    })

    // Get chain configurations
    const sourceConfig = getChainConfig(sourceChain)
    const destinationConfig = getChainConfig(destinationChain)

    // Convert amount to proper units (USDC has 6 decimals)
    const amountWei = ethers.parseUnits(amount, 6)

    // Prepare transfer parameters
    const finalityThreshold = transferType === 'fast' 
      ? FINALITY_THRESHOLDS.fast 
      : FINALITY_THRESHOLDS.standard

    // Calculate maxFee (for now, use a small percentage of the amount)
    const maxFee = amountWei - BigInt(1) // Leave 1 unit for fee

    let transactionHash: string

    try {
      if (isSolanaChain(sourceChain)) {
        // Handle Solana source chain
        transactionHash = await executeSolanaCCTPTransfer({
          sourceConfig,
          destinationConfig,
          amount: amountWei,
          destinationAddress,
          finalityThreshold,
          maxFee,
          hookData
        })
      } else {
        // Handle EVM source chain
        transactionHash = await executeEVMCCTPTransfer({
          sourceConfig,
          destinationConfig,
          amount: amountWei,
          destinationAddress,
          finalityThreshold,
          maxFee,
          hookData
        })
      }

      const response: ApiResponse<CCTPTransferResponse> = {
        success: true,
        data: {
          transactionHash,
          sourceChain,
          destinationChain,
          amount,
          status: PaymentStatus.PENDING_BURN,
          sessionId
        },
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (transferError) {
      logger.error('CCTP transfer failed', { 
        error: transferError instanceof Error ? transferError.message : 'Unknown error',
        sourceChain,
        destinationChain,
        amount
      })

      throw transferError
    }
  } catch (error) {
    next(error)
  }
})

// Get CCTP attestation
router.get('/attestation/:sourceChain/:txHash', async (req, res, next) => {
  try {
    const sourceChain = parseInt(req.params.sourceChain, 10)
    const { txHash } = req.params

    if (!Object.values(SupportedChainId).includes(sourceChain)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid source chain',
        timestamp: new Date().toISOString()
      })
    }

    const sourceConfig = getChainConfig(sourceChain)
    const sourceDomain = sourceConfig.destinationDomain

    // Query Circle's IRIS API for attestation using the V2 format
    const attestationUrl = `${config.irisApiUrl}/v2/messages/${sourceDomain}?transactionHash=${txHash}`

    logger.info('Querying IRIS API for attestation', { 
      url: attestationUrl,
      sourceChain,
      sourceDomain,
      txHash 
    })

    try {
      const response = await axios.get(attestationUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      logger.info('IRIS API response received', { 
        status: response.status,
        hasData: !!response.data,
        hasMessages: !!response.data?.messages,
        messageCount: response.data?.messages?.length || 0
      })

      if (response.data?.messages?.[0]) {
        const message = response.data.messages[0]
        
        const attestationResponse: AttestationResponse = {
          status: message.status === 'complete' ? 'complete' : 'pending',
          transactionHash: txHash
        }

        if (message.status === 'complete') {
          attestationResponse.attestation = message.attestation
          attestationResponse.message = message.message
          
          logger.info('Attestation complete', { 
            txHash,
            hasAttestation: !!message.attestation,
            hasMessage: !!message.message
          })
        } else {
          logger.info('Attestation pending', { 
            txHash,
            status: message.status
          })
        }

        const apiResponse: ApiResponse<AttestationResponse> = {
          success: true,
          data: attestationResponse,
          timestamp: new Date().toISOString()
        }

        res.json(apiResponse)
      } else {
        // Message not found yet
        logger.info('Message not found in IRIS API response', { txHash })
        
        const attestationResponse: AttestationResponse = {
          status: 'pending',
          transactionHash: txHash
        }

        const apiResponse: ApiResponse<AttestationResponse> = {
          success: true,
          data: attestationResponse,
          timestamp: new Date().toISOString()
        }

        res.json(apiResponse)
      }
    } catch (irisError) {
      if (axios.isAxiosError(irisError)) {
        if (irisError.response?.status === 404) {
          // Message not found yet, return pending status
          logger.info('Message not found (404), returning pending status', { txHash })
          
          const attestationResponse: AttestationResponse = {
            status: 'pending',
            transactionHash: txHash
          }

          const apiResponse: ApiResponse<AttestationResponse> = {
            success: true,
            data: attestationResponse,
            timestamp: new Date().toISOString()
          }

          res.json(apiResponse)
        } else {
          logger.error('IRIS API error', { 
            status: irisError.response?.status,
            statusText: irisError.response?.statusText,
            data: irisError.response?.data,
            txHash
          })
          throw irisError
        }
      } else {
        logger.error('Non-Axios error querying IRIS API', { 
          error: irisError instanceof Error ? irisError.message : 'Unknown error',
          txHash
        })
        throw irisError
      }
    }
  } catch (error) {
    next(error)
  }
})

// Complete CCTP transfer on destination chain
router.post('/complete', async (req, res, next) => {
  try {
    const { 
      message, 
      attestation, 
      destinationChain, 
      sessionId 
    } = req.body

    if (!message || !attestation || !destinationChain) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: message, attestation, destinationChain',
        timestamp: new Date().toISOString()
      })
    }

    if (!Object.values(SupportedChainId).includes(destinationChain)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported destination chain',
        timestamp: new Date().toISOString()
      })
    }

    logger.info('Completing CCTP transfer on destination chain', { 
      destinationChain,
      sessionId,
      hasMessage: !!message,
      hasAttestation: !!attestation
    })

    const destinationConfig = getChainConfig(destinationChain)

    let transactionHash: string

    if (isSolanaChain(destinationChain)) {
      // Handle Solana destination chain
      transactionHash = await completeSolanaCCTPTransfer({
        message,
        attestation,
        destinationConfig
      })
    } else {
      // Handle EVM destination chain
      transactionHash = await completeEVMCCTPTransfer({
        message,
        attestation,
        destinationConfig
      })
    }

    const response: ApiResponse<{ 
      transactionHash: string, 
      destinationChain: SupportedChainId,
      status: PaymentStatus,
      sessionId?: string 
    }> = {
      success: true,
      data: {
        transactionHash,
        destinationChain,
        status: PaymentStatus.COMPLETED,
        sessionId
      },
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

// Get minimum fee for a transfer
router.get('/min-fee/:chainId/:amount', async (req, res, next) => {
  try {
    const chainId = parseInt(req.params.chainId, 10)
    const amount = req.params.amount

    if (!Object.values(SupportedChainId).includes(chainId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chain ID',
        timestamp: new Date().toISOString()
      })
    }

    if (isSolanaChain(chainId)) {
      // For Solana, fees are typically very low
      const response: ApiResponse<{ minFee: string, chainId: SupportedChainId }> = {
        success: true,
        data: {
          minFee: '0', // Solana CCTP fees are typically 0
          chainId
        },
        timestamp: new Date().toISOString()
      }

      res.json(response)
      return
    }

    // For EVM chains, query the TokenMessenger contract
    const chainConfig = getChainConfig(chainId)
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
    
    const tokenMessengerContract = new ethers.Contract(
      chainConfig.tokenMessengerAddress,
      TokenMessengerV2ABI,
      provider
    )

    try {
      // Convert amount to proper units (USDC has 6 decimals)
      const amountWei = ethers.parseUnits(amount, 6)
      const minFee = await tokenMessengerContract.getMinFeeAmount(amountWei)

      const response: ApiResponse<{ minFee: string, chainId: SupportedChainId }> = {
        success: true,
        data: {
          minFee: minFee.toString(),
          chainId
        },
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (contractError) {
      logger.error('Error querying min fee from contract', {
        error: contractError instanceof Error ? contractError.message : 'Unknown error',
        chainId,
        amount
      })

      // Return 0 as fallback
      const response: ApiResponse<{ minFee: string, chainId: SupportedChainId }> = {
        success: true,
        data: {
          minFee: '0',
          chainId
        },
        timestamp: new Date().toISOString()
      }

      res.json(response)
    }
  } catch (error) {
    next(error)
  }
})

// Get CCTP transfer status by transaction hash
router.get('/status/:sourceChain/:txHash', async (req, res, next) => {
  try {
    const sourceChain = parseInt(req.params.sourceChain, 10)
    const { txHash } = req.params

    if (!Object.values(SupportedChainId).includes(sourceChain)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid source chain',
        timestamp: new Date().toISOString()
      })
    }

    logger.info('Checking CCTP transfer status', { sourceChain, txHash })

    // Check transaction status on source chain
    const sourceConfig = getChainConfig(sourceChain)
    let txStatus: 'pending' | 'confirmed' | 'failed' = 'pending'
    let confirmations = 0

    if (!isSolanaChain(sourceChain)) {
      // For EVM chains, check transaction receipt
      const provider = new ethers.JsonRpcProvider(sourceConfig.rpcUrl)
      
      try {
        const receipt = await provider.getTransactionReceipt(txHash)
        if (receipt) {
          if (receipt.status === 1) {
            txStatus = 'confirmed'
            const currentBlock = await provider.getBlockNumber()
            confirmations = currentBlock - receipt.blockNumber
          } else {
            txStatus = 'failed'
          }
        }
      } catch (rpcError) {
        logger.warn('Error checking transaction receipt', {
          error: rpcError instanceof Error ? rpcError.message : 'Unknown error',
          txHash
        })
      }
    }

    // Also check attestation status
    let attestationStatus: 'pending' | 'complete' = 'pending'
    try {
      const sourceDomain = sourceConfig.destinationDomain
      const attestationUrl = `${config.irisApiUrl}/v2/messages/${sourceDomain}?transactionHash=${txHash}`
      
      const response = await axios.get(attestationUrl, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (response.data?.messages?.[0]?.status === 'complete') {
        attestationStatus = 'complete'
      }
    } catch (attestationError) {
      // Ignore attestation errors for status check
      logger.debug('Could not check attestation status', {
        error: attestationError instanceof Error ? attestationError.message : 'Unknown error'
      })
    }

    const response: ApiResponse<{ 
      transactionHash: string
      sourceChain: SupportedChainId
      transactionStatus: string
      confirmations: number
      attestationStatus: string
      canComplete: boolean
    }> = {
      success: true,
      data: {
        transactionHash: txHash,
        sourceChain,
        transactionStatus: txStatus,
        confirmations,
        attestationStatus,
        canComplete: txStatus === 'confirmed' && attestationStatus === 'complete'
      },
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

// Helper functions for executing transfers
async function executeEVMCCTPTransfer(params: {
  sourceConfig: any
  destinationConfig: any
  amount: bigint
  destinationAddress: string
  finalityThreshold: number
  maxFee: bigint
  hookData?: string
}): Promise<string> {
  const {
    sourceConfig,
    destinationConfig,
    amount,
    destinationAddress,
    finalityThreshold,
    maxFee,
    hookData
  } = params

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(sourceConfig.rpcUrl)
  const wallet = new ethers.Wallet(config.evmPrivateKey, provider)

  logger.info('Setting up EVM CCTP transfer', {
    sourceChain: sourceConfig.chainId,
    destinationChain: destinationConfig.chainId,
    amount: amount.toString(),
    destinationAddress,
    finalityThreshold
  })

  // First check USDC balance
  const usdcContract = new ethers.Contract(
    sourceConfig.usdcAddress,
    USDCABI,
    wallet
  )

  const balance = await usdcContract.balanceOf(wallet.address)
  if (balance < amount) {
    throw new Error(`Insufficient USDC balance. Required: ${amount.toString()}, Available: ${balance.toString()}`)
  }

  // Check current allowance
  const currentAllowance = await usdcContract.allowance(
    wallet.address,
    sourceConfig.tokenMessengerAddress
  )

  // Approve USDC if needed
  if (currentAllowance < amount) {
    logger.info('Approving USDC for transfer', { 
      currentAllowance: currentAllowance.toString(),
      requiredAmount: amount.toString()
    })

    const approveTx = await usdcContract.approve(
      sourceConfig.tokenMessengerAddress,
      amount
    )
    const approveReceipt = await approveTx.wait()

    logger.info('USDC approved for transfer', { 
      txHash: approveTx.hash,
      gasUsed: approveReceipt?.gasUsed?.toString()
    })
  }

  // Prepare mint recipient (pad address to 32 bytes)
  let mintRecipient: string
  if (isSolanaChain(destinationConfig.chainId)) {
    // For Solana destinations, convert the address properly
    // The destinationAddress should be a Solana token account address
    try {
      const solanaAddress = new PublicKey(destinationAddress)
      mintRecipient = ethers.hexlify(solanaAddress.toBuffer())
    } catch (error) {
      throw new Error(`Invalid Solana destination address: ${destinationAddress}`)
    }
  } else {
    // For EVM destinations, pad the address to 32 bytes
    mintRecipient = ethers.zeroPadValue(destinationAddress, 32)
  }

  // Prepare destination caller (zero address means anyone can call)
  const destinationCaller = '0x0000000000000000000000000000000000000000000000000000000000000000'

  // Create TokenMessenger contract instance
  const tokenMessengerContract = new ethers.Contract(
    sourceConfig.tokenMessengerAddress,
    TokenMessengerV2ABI,
    wallet
  )

  let burnTx: ethers.ContractTransactionResponse

  if (hookData && hookData !== '0x') {
    // Use depositForBurnWithHook if hook data is provided
    logger.info('Executing depositForBurnWithHook', {
      amount: amount.toString(),
      destinationDomain: destinationConfig.destinationDomain,
      mintRecipient,
      burnToken: sourceConfig.usdcAddress,
      destinationCaller,
      maxFee: maxFee.toString(),
      finalityThreshold,
      hookDataLength: hookData.length
    })

    burnTx = await tokenMessengerContract.depositForBurnWithHook(
      amount,
      destinationConfig.destinationDomain,
      mintRecipient,
      sourceConfig.usdcAddress,
      destinationCaller,
      maxFee,
      finalityThreshold,
      hookData
    )
  } else {
    // Use regular depositForBurn
    logger.info('Executing depositForBurn', {
      amount: amount.toString(),
      destinationDomain: destinationConfig.destinationDomain,
      mintRecipient,
      burnToken: sourceConfig.usdcAddress,
      destinationCaller,
      maxFee: maxFee.toString(),
      finalityThreshold
    })

    burnTx = await tokenMessengerContract.depositForBurn(
      amount,
      destinationConfig.destinationDomain,
      mintRecipient,
      sourceConfig.usdcAddress,
      destinationCaller,
      maxFee,
      finalityThreshold
    )
  }

  const burnReceipt = await burnTx.wait()

  logger.info('CCTP burn transaction completed', { 
    txHash: burnTx.hash,
    gasUsed: burnReceipt?.gasUsed?.toString(),
    blockNumber: burnReceipt?.blockNumber
  })

  return burnTx.hash
}

async function executeSolanaCCTPTransfer(params: {
  sourceConfig: any
  destinationConfig: any
  amount: bigint
  destinationAddress: string
  finalityThreshold: number
  maxFee: bigint
  hookData?: string
}): Promise<string> {
  const {
    sourceConfig,
    destinationConfig,
    amount,
    destinationAddress,
    finalityThreshold,
    maxFee,
    hookData
  } = params

  logger.info('Setting up Solana CCTP transfer', {
    sourceChain: sourceConfig.chainId,
    destinationChain: destinationConfig.chainId,
    amount: amount.toString(),
    destinationAddress,
    finalityThreshold
  })

  // Create Solana connection and wallet
  const connection = new Connection(sourceConfig.rpcUrl, 'confirmed')
  const payer = Keypair.fromSecretKey(bs58.decode(config.solanaPrivateKey))

  // Convert amount to Solana format (USDC has 6 decimals)
  const amountBN = new BN(amount.toString())

  // Prepare mint recipient for destination chain
  let mintRecipientBytes: Buffer
  if (isSolanaChain(destinationConfig.chainId)) {
    // Solana to Solana - use the provided Solana address
    const mintRecipientPubkey = new PublicKey(destinationAddress)
    mintRecipientBytes = mintRecipientPubkey.toBuffer()
  } else {
    // Solana to EVM - convert EVM address to 32-byte format
    const evmAddressBytes = Buffer.from(destinationAddress.replace('0x', ''), 'hex')
    mintRecipientBytes = Buffer.alloc(32)
    evmAddressBytes.copy(mintRecipientBytes, 32 - evmAddressBytes.length) // Right-align
  }

  // Get user's USDC token account
  const userTokenAccount = await getAssociatedTokenAddress(
    SOLANA_USDC_MINT,
    payer.publicKey
  )

  // Check if token account exists and has sufficient balance
  try {
    const tokenAccountInfo = await getAccount(connection, userTokenAccount)
    if (tokenAccountInfo.amount < amount) {
      throw new Error(`Insufficient USDC balance. Required: ${amount.toString()}, Available: ${tokenAccountInfo.amount.toString()}`)
    }
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError) {
      throw new Error('USDC token account not found. Please ensure you have USDC tokens.')
    }
    throw error
  }

  // Derive required PDAs
  const [tokenMessenger] = deriveTokenMessengerPDA()
  const [tokenMinter] = deriveTokenMinterPDA()
  const [localToken] = deriveLocalTokenPDA(SOLANA_USDC_MINT)
  const [custodyTokenAccount] = deriveCustodyTokenPDA(SOLANA_USDC_MINT)
  const [eventAuthority] = deriveEventAuthorityPDA()

  // Generate message sent event account (this is correct for CCTP)
  const messageSentEventAccount = web3.Keypair.generate()

  // Get proper instruction discriminator for depositForBurn
  const instructionDiscriminator = getInstructionDiscriminator('global', 'deposit_for_burn')

  // Build instruction data
  const instructionDataSize = 8 + // discriminator
                              8 + // amount
                              4 + // destination domain
                              32 + // mint recipient
                              32; // destination caller (optional but included)

  const instructionData = Buffer.alloc(instructionDataSize)
  let offset = 0

  // Write instruction discriminator
  instructionDiscriminator.copy(instructionData, offset)
  offset += 8

  // Write amount (u64 little-endian)
  const amountBuffer = Buffer.alloc(8)
  amountBuffer.writeBigUInt64LE(BigInt(amount.toString()), 0)
  amountBuffer.copy(instructionData, offset)
  offset += 8

  // Write destination domain (u32 little-endian)
  instructionData.writeUInt32LE(destinationConfig.destinationDomain, offset)
  offset += 4

  // Write mint recipient (32 bytes)
  mintRecipientBytes.copy(instructionData, offset)
  offset += 32

  // Write destination caller (32 bytes - use default/zero for anyone can call)
  const destinationCallerBytes = Buffer.alloc(32)
  destinationCallerBytes.copy(instructionData, offset)

  // Build accounts array for depositForBurn
  const accounts: AccountMeta[] = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true }, // owner/authority
    { pubkey: messageSentEventAccount.publicKey, isSigner: true, isWritable: true }, // event rent payer  
    { pubkey: userTokenAccount, isSigner: false, isWritable: true }, // burn token account
    { pubkey: SOLANA_USDC_MINT, isSigner: false, isWritable: true }, // mint
    { pubkey: tokenMessenger, isSigner: false, isWritable: true }, // token messenger
    { pubkey: tokenMinter, isSigner: false, isWritable: true }, // token minter
    { pubkey: localToken, isSigner: false, isWritable: true }, // local token
    { pubkey: custodyTokenAccount, isSigner: false, isWritable: true }, // custody token account
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token program
    { pubkey: SOLANA_MESSAGE_TRANSMITTER_PROGRAM_ID, isSigner: false, isWritable: false }, // message transmitter program
    { pubkey: eventAuthority, isSigner: false, isWritable: false }, // event authority
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system program
    { pubkey: messageSentEventAccount.publicKey, isSigner: false, isWritable: true }, // message sent event data account
  ]

  // Create the instruction
  const instruction = new TransactionInstruction({
    keys: accounts,
    programId: SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID,
    data: instructionData
  })

  // Create transaction with proper compute budget
  const transaction = new Transaction()
  
  // Add compute budget to handle complex instruction
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10 }) // Slightly higher for reliability
  )

  // Create message sent event account first
  const createEventAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: messageSentEventAccount.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(1000),
    space: 1000,
    programId: SOLANA_MESSAGE_TRANSMITTER_PROGRAM_ID
  })

  transaction.add(createEventAccountInstruction, instruction)

  // Send transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, messageSentEventAccount],
    {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
      skipPreflight: false
    }
  )

  logger.info('Solana CCTP burn transaction completed', {
    signature,
    messageSentEventAccount: messageSentEventAccount.publicKey.toString(),
    amount: amount.toString(),
    destinationDomain: destinationConfig.destinationDomain
  })

  return signature
}

async function completeEVMCCTPTransfer(params: {
  message: string
  attestation: string
  destinationConfig: any
}): Promise<string> {
  const { message, attestation, destinationConfig } = params

  // Create provider and wallet for destination chain
  const provider = new ethers.JsonRpcProvider(destinationConfig.rpcUrl)
  const wallet = new ethers.Wallet(config.evmPrivateKey, provider)

  logger.info('Completing CCTP transfer on EVM destination chain', {
    destinationChain: destinationConfig.chainId,
    messageLength: message.length,
    attestationLength: attestation.length
  })

  // Create MessageTransmitter contract instance
  const messageTransmitterContract = new ethers.Contract(
    destinationConfig.messageTransmitterAddress,
    MessageTransmitterV2ABI,
    wallet
  )

  // Execute receiveMessage on destination chain
  const receiveTx = await messageTransmitterContract.receiveMessage(
    message,
    attestation
  )

  const receiveReceipt = await receiveTx.wait()

  logger.info('CCTP receive message completed', {
    txHash: receiveTx.hash,
    gasUsed: receiveReceipt?.gasUsed?.toString(),
    blockNumber: receiveReceipt?.blockNumber
  })

  return receiveTx.hash
}

async function completeSolanaCCTPTransfer(params: {
  message: string
  attestation: string
  destinationConfig: any
}): Promise<string> {
  const { message, attestation, destinationConfig } = params

  logger.info('Completing CCTP transfer on Solana destination chain', {
    destinationChain: destinationConfig.chainId,
    messageLength: message.length,
    attestationLength: attestation.length
  })

  // Create Solana connection and wallet
  const connection = new Connection(destinationConfig.rpcUrl, 'confirmed')
  const payer = Keypair.fromSecretKey(bs58.decode(config.solanaPrivateKey))

  // Parse the message properly to extract all required information
  const parsedMessage = parseMessage(message)
  const parsedDepositForBurn = parseDepositForBurnMessage(parsedMessage.messageBody)

  logger.info('Parsed CCTP message', {
    sourceDomain: parsedMessage.sourceDomain,
    destinationDomain: parsedMessage.destinationDomain,
    nonce: parsedMessage.nonce.toString(),
    amount: parsedDepositForBurn.amount.toString()
  })

  // Extract mint recipient from the parsed message
  const mintRecipientBytes = parsedDepositForBurn.mintRecipient
  const mintRecipient = new PublicKey(mintRecipientBytes)

  // Ensure mint recipient token account exists
  try {
    await getAccount(connection, mintRecipient)
    logger.info('Mint recipient token account exists', {
      mintRecipient: mintRecipient.toString()
    })
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError) {
      // Create the associated token account if it doesn't exist
      const tokenOwner = new PublicKey(mintRecipientBytes) // This should be the actual owner
      const createATAInstruction = createAssociatedTokenAccountInstruction(
        payer.publicKey, // payer
        mintRecipient, // associated token account
        tokenOwner, // owner
        SOLANA_USDC_MINT // mint
      )

      const createATATransaction = new Transaction().add(createATAInstruction)
      await sendAndConfirmTransaction(connection, createATATransaction, [payer])
      
      logger.info('Created associated token account for mint recipient', {
        mintRecipient: mintRecipient.toString(),
        owner: tokenOwner.toString()
      })
    } else {
      throw error
    }
  }

  // Derive required PDAs
  const [tokenMessenger] = deriveTokenMessengerPDA()
  const [remoteTokenMessenger] = deriveRemoteTokenMessengerPDA(parsedMessage.sourceDomain)
  const [tokenMinter] = deriveTokenMinterPDA()
  const [localToken] = deriveLocalTokenPDA(SOLANA_USDC_MINT)
  const [custodyTokenAccount] = deriveCustodyTokenPDA(SOLANA_USDC_MINT)
  const [eventAuthority] = deriveEventAuthorityPDA()

  // For token pair, we need to extract the source token from the message
  const sourceBurnToken = new PublicKey(parsedDepositForBurn.burnToken)
  const [tokenPair] = deriveTokenPairPDA(parsedMessage.sourceDomain, sourceBurnToken)

  // Get proper instruction discriminator for receiveMessage
  const receiveMessageDiscriminator = getInstructionDiscriminator('global', 'receive_message')

  // Prepare message and attestation buffers
  const messageBuffer = Buffer.from(message.startsWith('0x') ? message.slice(2) : message, 'hex')
  const attestationBuffer = Buffer.from(attestation.startsWith('0x') ? attestation.slice(2) : attestation, 'hex')

  // Build instruction data for receiveMessage
  const instructionDataSize = 8 + // discriminator
                              4 + messageBuffer.length + // message with length prefix
                              4 + attestationBuffer.length; // attestation with length prefix

  const instructionData = Buffer.alloc(instructionDataSize)
  let offset = 0

  // Write discriminator
  receiveMessageDiscriminator.copy(instructionData, offset)
  offset += 8

  // Write message with length prefix
  instructionData.writeUInt32LE(messageBuffer.length, offset)
  offset += 4
  messageBuffer.copy(instructionData, offset)
  offset += messageBuffer.length

  // Write attestation with length prefix
  instructionData.writeUInt32LE(attestationBuffer.length, offset)
  offset += 4
  attestationBuffer.copy(instructionData, offset)

  // Build accounts array for receiveMessage
  const accounts: AccountMeta[] = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true }, // payer
    { pubkey: payer.publicKey, isSigner: false, isWritable: false }, // caller
    // Message Transmitter accounts (authority_pda derived separately if needed)
    { pubkey: SOLANA_MESSAGE_TRANSMITTER_PROGRAM_ID, isSigner: false, isWritable: false }, // message transmitter program
    // Token Messenger Minter accounts for CPI
    { pubkey: tokenMessenger, isSigner: false, isWritable: false }, // token messenger
    { pubkey: remoteTokenMessenger, isSigner: false, isWritable: false }, // remote token messenger
    { pubkey: tokenMinter, isSigner: false, isWritable: true }, // token minter
    { pubkey: localToken, isSigner: false, isWritable: true }, // local token
    { pubkey: tokenPair, isSigner: false, isWritable: false }, // token pair
    { pubkey: mintRecipient, isSigner: false, isWritable: true }, // user token account
    { pubkey: custodyTokenAccount, isSigner: false, isWritable: true }, // custody token account
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token program
    { pubkey: eventAuthority, isSigner: false, isWritable: false }, // event authority
    { pubkey: SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID, isSigner: false, isWritable: false }, // token messenger minter program
  ]

  // Create the instruction
  const instruction = new TransactionInstruction({
    keys: accounts,
    programId: SOLANA_MESSAGE_TRANSMITTER_PROGRAM_ID,
    data: instructionData
  })

  // Create transaction with proper compute budget
  const transaction = new Transaction()
  
  // Add compute budget for complex instruction
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10 }) // Higher priority for completion
  )

  transaction.add(instruction)

  // Send transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer],
    {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
      skipPreflight: false
    }
  )

  logger.info('Solana CCTP receive message completed', {
    signature,
    mintRecipient: mintRecipient.toString(),
    amount: parsedDepositForBurn.amount.toString(),
    sourceDomain: parsedMessage.sourceDomain,
    nonce: parsedMessage.nonce.toString()
  })

  return signature
}

export { router as cctpRoutes }
