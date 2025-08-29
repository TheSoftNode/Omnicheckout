import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  SystemProgram,
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
  TokenAccountNotFoundError
} from '@solana/spl-token'
import { BN, web3 } from '@coral-xyz/anchor'
import bs58 from 'bs58'

import { CCTPService, CCTPTransferParams, CCTPCompletionParams } from '../interfaces/cctp.interface'
import { createLogger } from '../utils/logger'
import { getConfig } from '../config'
import { isSolanaChain } from '../config/chains'
import { parseMessage, parseDepositForBurnMessage } from '../utils/cctp/messageParser'
import {
  SOLANA_MESSAGE_TRANSMITTER_PROGRAM_ID,
  SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID,
  SOLANA_USDC_MINT,
  deriveTokenMessengerPDA,
  deriveRemoteTokenMessengerPDA,
  deriveTokenMinterPDA,
  deriveLocalTokenPDA,
  deriveTokenPairPDA,
  deriveCustodyTokenPDA,
  deriveEventAuthorityPDA,
  getInstructionDiscriminator
} from '../utils/cctp/solanaUtils'

const logger = createLogger('SolanaCCTPService')
const config = getConfig()

export class SolanaCCTPService implements CCTPService {
  async executeTransfer(params: CCTPTransferParams): Promise<string> {
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

    // Prepare mint recipient for destination chain
    const mintRecipientBytes = this.prepareMintRecipient(destinationAddress, destinationConfig.chainId)

    // Check user's USDC balance
    await this.checkUSDCBalance(connection, payer.publicKey, amount)

    // Execute the burn transaction
    const signature = await this.executeBurnTransaction(
      connection,
      payer,
      amount,
      destinationConfig.destinationDomain,
      mintRecipientBytes
    )

    logger.info('Solana CCTP burn transaction completed', {
      signature,
      amount: amount.toString(),
      destinationDomain: destinationConfig.destinationDomain
    })

    return signature
  }

  async completeTransfer(params: CCTPCompletionParams): Promise<string> {
    const { message, attestation, destinationConfig } = params

    logger.info('Completing CCTP transfer on Solana destination chain', {
      destinationChain: destinationConfig.chainId,
      messageLength: message.length,
      attestationLength: attestation.length
    })

    // Create Solana connection and wallet
    const connection = new Connection(destinationConfig.rpcUrl, 'confirmed')
    const payer = Keypair.fromSecretKey(bs58.decode(config.solanaPrivateKey))

    // Parse the message to extract required information
    const parsedMessage = parseMessage(message)
    const parsedDepositForBurn = parseDepositForBurnMessage(parsedMessage.messageBody)

    logger.info('Parsed CCTP message', {
      sourceDomain: parsedMessage.sourceDomain,
      destinationDomain: parsedMessage.destinationDomain,
      nonce: parsedMessage.nonce.toString(),
      amount: parsedDepositForBurn.amount.toString()
    })

    // Extract mint recipient and ensure token account exists
    const mintRecipient = new PublicKey(parsedDepositForBurn.mintRecipient)
    await this.ensureTokenAccountExists(connection, payer, mintRecipient)

    // Execute the receive message transaction
    const signature = await this.executeReceiveMessageTransaction(
      connection,
      payer,
      message,
      attestation,
      parsedMessage,
      parsedDepositForBurn,
      mintRecipient
    )

    logger.info('Solana CCTP receive message completed', {
      signature,
      mintRecipient: mintRecipient.toString(),
      amount: parsedDepositForBurn.amount.toString()
    })

    return signature
  }

  private prepareMintRecipient(destinationAddress: string, destinationChainId: number): Buffer {
    if (isSolanaChain(destinationChainId)) {
      // Solana to Solana - use the provided Solana address
      const mintRecipientPubkey = new PublicKey(destinationAddress)
      return mintRecipientPubkey.toBuffer()
    } else {
      // Solana to EVM - convert EVM address to 32-byte format
      const evmAddressBytes = Buffer.from(destinationAddress.replace('0x', ''), 'hex')
      const mintRecipientBytes = Buffer.alloc(32)
      evmAddressBytes.copy(mintRecipientBytes, 32 - evmAddressBytes.length) // Right-align
      return mintRecipientBytes
    }
  }

  private async checkUSDCBalance(connection: Connection, publicKey: PublicKey, amount: bigint): Promise<void> {
    const userTokenAccount = await getAssociatedTokenAddress(SOLANA_USDC_MINT, publicKey)

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
  }

  private async executeBurnTransaction(
    connection: Connection,
    payer: Keypair,
    amount: bigint,
    destinationDomain: number,
    mintRecipientBytes: Buffer
  ): Promise<string> {
    // Get user's USDC token account
    const userTokenAccount = await getAssociatedTokenAddress(SOLANA_USDC_MINT, payer.publicKey)

    // Derive required PDAs
    const [tokenMessenger] = deriveTokenMessengerPDA()
    const [tokenMinter] = deriveTokenMinterPDA()
    const [localToken] = deriveLocalTokenPDA(SOLANA_USDC_MINT)
    const [custodyTokenAccount] = deriveCustodyTokenPDA(SOLANA_USDC_MINT)
    const [eventAuthority] = deriveEventAuthorityPDA()

    // Generate message sent event account
    const messageSentEventAccount = web3.Keypair.generate()

    // Get instruction discriminator for depositForBurn
    const instructionDiscriminator = getInstructionDiscriminator('global', 'deposit_for_burn')

    // Build instruction data
    const instructionData = this.buildDepositForBurnInstruction(
      instructionDiscriminator,
      amount,
      destinationDomain,
      mintRecipientBytes
    )

    // Build accounts array
    const accounts = this.buildDepositForBurnAccounts(
      payer,
      messageSentEventAccount,
      userTokenAccount,
      tokenMessenger,
      tokenMinter,
      localToken,
      custodyTokenAccount,
      eventAuthority
    )

    // Create and send transaction
    return await this.sendBurnTransaction(
      connection,
      payer,
      messageSentEventAccount,
      instructionData,
      accounts
    )
  }

  private async executeReceiveMessageTransaction(
    connection: Connection,
    payer: Keypair,
    message: string,
    attestation: string,
    parsedMessage: any,
    parsedDepositForBurn: any,
    mintRecipient: PublicKey
  ): Promise<string> {
    // Derive required PDAs
    const [tokenMessenger] = deriveTokenMessengerPDA()
    const [remoteTokenMessenger] = deriveRemoteTokenMessengerPDA(parsedMessage.sourceDomain)
    const [tokenMinter] = deriveTokenMinterPDA()
    const [localToken] = deriveLocalTokenPDA(SOLANA_USDC_MINT)
    const [custodyTokenAccount] = deriveCustodyTokenPDA(SOLANA_USDC_MINT)
    const [eventAuthority] = deriveEventAuthorityPDA()

    // For token pair, extract the source token from the message
    const sourceBurnToken = new PublicKey(parsedDepositForBurn.burnToken)
    const [tokenPair] = deriveTokenPairPDA(parsedMessage.sourceDomain, sourceBurnToken)

    // Build instruction data
    const instructionData = this.buildReceiveMessageInstruction(message, attestation)

    // Build accounts array
    const accounts = this.buildReceiveMessageAccounts(
      payer,
      tokenMessenger,
      remoteTokenMessenger,
      tokenMinter,
      localToken,
      tokenPair,
      mintRecipient,
      custodyTokenAccount,
      eventAuthority
    )

    // Create and send transaction
    return await this.sendReceiveMessageTransaction(connection, payer, instructionData, accounts)
  }

  private buildDepositForBurnInstruction(
    discriminator: Buffer,
    amount: bigint,
    destinationDomain: number,
    mintRecipientBytes: Buffer
  ): Buffer {
    const instructionDataSize = 8 + 8 + 4 + 32 + 32 // discriminator + amount + domain + recipient + caller
    const instructionData = Buffer.alloc(instructionDataSize)
    let offset = 0

    // Write instruction discriminator
    discriminator.copy(instructionData, offset)
    offset += 8

    // Write amount (u64 little-endian)
    const amountBuffer = Buffer.alloc(8)
    amountBuffer.writeBigUInt64LE(BigInt(amount.toString()), 0)
    amountBuffer.copy(instructionData, offset)
    offset += 8

    // Write destination domain (u32 little-endian)
    instructionData.writeUInt32LE(destinationDomain, offset)
    offset += 4

    // Write mint recipient (32 bytes)
    mintRecipientBytes.copy(instructionData, offset)
    offset += 32

    // Write destination caller (32 bytes - zero for anyone can call)
    const destinationCallerBytes = Buffer.alloc(32)
    destinationCallerBytes.copy(instructionData, offset)

    return instructionData
  }

  private buildReceiveMessageInstruction(message: string, attestation: string): Buffer {
    const receiveMessageDiscriminator = getInstructionDiscriminator('global', 'receive_message')
    
    const messageBuffer = Buffer.from(message.startsWith('0x') ? message.slice(2) : message, 'hex')
    const attestationBuffer = Buffer.from(attestation.startsWith('0x') ? attestation.slice(2) : attestation, 'hex')

    const instructionDataSize = 8 + 4 + messageBuffer.length + 4 + attestationBuffer.length
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

    return instructionData
  }

  private buildDepositForBurnAccounts(
    payer: Keypair,
    messageSentEventAccount: Keypair,
    userTokenAccount: PublicKey,
    tokenMessenger: PublicKey,
    tokenMinter: PublicKey,
    localToken: PublicKey,
    custodyTokenAccount: PublicKey,
    eventAuthority: PublicKey
  ): AccountMeta[] {
    return [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: messageSentEventAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: SOLANA_USDC_MINT, isSigner: false, isWritable: true },
      { pubkey: tokenMessenger, isSigner: false, isWritable: true },
      { pubkey: tokenMinter, isSigner: false, isWritable: true },
      { pubkey: localToken, isSigner: false, isWritable: true },
      { pubkey: custodyTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SOLANA_MESSAGE_TRANSMITTER_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: messageSentEventAccount.publicKey, isSigner: false, isWritable: true },
    ]
  }

  private buildReceiveMessageAccounts(
    payer: Keypair,
    tokenMessenger: PublicKey,
    remoteTokenMessenger: PublicKey,
    tokenMinter: PublicKey,
    localToken: PublicKey,
    tokenPair: PublicKey,
    mintRecipient: PublicKey,
    custodyTokenAccount: PublicKey,
    eventAuthority: PublicKey
  ): AccountMeta[] {
    return [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: payer.publicKey, isSigner: false, isWritable: false },
      { pubkey: SOLANA_MESSAGE_TRANSMITTER_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: tokenMessenger, isSigner: false, isWritable: false },
      { pubkey: remoteTokenMessenger, isSigner: false, isWritable: false },
      { pubkey: tokenMinter, isSigner: false, isWritable: true },
      { pubkey: localToken, isSigner: false, isWritable: true },
      { pubkey: tokenPair, isSigner: false, isWritable: false },
      { pubkey: mintRecipient, isSigner: false, isWritable: true },
      { pubkey: custodyTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
  }

  private async sendBurnTransaction(
    connection: Connection,
    payer: Keypair,
    messageSentEventAccount: Keypair,
    instructionData: Buffer,
    accounts: AccountMeta[]
  ): Promise<string> {
    const instruction = new TransactionInstruction({
      keys: accounts,
      programId: SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID,
      data: instructionData
    })

    const transaction = new Transaction()
    
    // Add compute budget
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10 })
    )

    // Create message sent event account
    const createEventAccountInstruction = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: messageSentEventAccount.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(1000),
      space: 1000,
      programId: SOLANA_MESSAGE_TRANSMITTER_PROGRAM_ID
    })

    transaction.add(createEventAccountInstruction, instruction)

    return await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, messageSentEventAccount],
      {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
        skipPreflight: false
      }
    )
  }

  private async sendReceiveMessageTransaction(
    connection: Connection,
    payer: Keypair,
    instructionData: Buffer,
    accounts: AccountMeta[]
  ): Promise<string> {
    const instruction = new TransactionInstruction({
      keys: accounts,
      programId: SOLANA_MESSAGE_TRANSMITTER_PROGRAM_ID,
      data: instructionData
    })

    const transaction = new Transaction()
    
    // Add compute budget
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10 })
    )

    transaction.add(instruction)

    return await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
        skipPreflight: false
      }
    )
  }

  private async ensureTokenAccountExists(
    connection: Connection,
    payer: Keypair,
    mintRecipient: PublicKey
  ): Promise<void> {
    try {
      await getAccount(connection, mintRecipient)
      logger.info('Mint recipient token account exists', {
        mintRecipient: mintRecipient.toString()
      })
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        // Create the associated token account if it doesn't exist
        const tokenOwner = new PublicKey(mintRecipient.toBuffer())
        const createATAInstruction = createAssociatedTokenAccountInstruction(
          payer.publicKey,
          mintRecipient,
          tokenOwner,
          SOLANA_USDC_MINT
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
  }
}
