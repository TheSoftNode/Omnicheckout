import { ethers } from 'ethers'
import { CCTPService, CCTPTransferParams, CCTPCompletionParams } from '../interfaces/cctp.interface'
import { createLogger } from '../utils/logger'
import { getConfig } from '../config'
import { isSolanaChain } from '../config/chains'
import { PublicKey } from '@solana/web3.js'
import TokenMessengerV2ABI from '../abis/TokenMessengerV2.json'
import MessageTransmitterV2ABI from '../abis/MessageTransmitterV2.json'
import USDCABI from '../abis/USDC.json'
import omniCheckoutHookService from './omniCheckoutHookService'

const logger = createLogger('EVMCCTPService')
const config = getConfig()

export class EVMCCTPService implements CCTPService {
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

    logger.info('Setting up EVM CCTP transfer', {
      sourceChain: sourceConfig.chainId,
      destinationChain: destinationConfig.chainId,
      amount: amount.toString(),
      destinationAddress,
      finalityThreshold
    })

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(sourceConfig.rpcUrl)
    const wallet = new ethers.Wallet(config.evmPrivateKey, provider)

    // Check USDC balance
    const usdcContract = new ethers.Contract(
      sourceConfig.usdcAddress,
      USDCABI,
      wallet
    )

    const balance = await usdcContract.balanceOf(wallet.address)
    if (balance < amount) {
      throw new Error(`Insufficient USDC balance. Required: ${amount.toString()}, Available: ${balance.toString()}`)
    }

    // Check and approve USDC if needed
    await this.ensureUSDCApproval(usdcContract, wallet.address, sourceConfig.tokenMessengerAddress, amount)

    // Prepare mint recipient address
    const mintRecipient = this.prepareMintRecipient(destinationAddress, destinationConfig.chainId)

    // Prepare destination caller (zero address means anyone can call)
    const destinationCaller = '0x0000000000000000000000000000000000000000000000000000000000000000'

    // Execute burn transaction
    const transactionHash = await this.executeBurnTransaction(
      sourceConfig,
      destinationConfig,
      amount,
      mintRecipient,
      destinationCaller,
      maxFee,
      finalityThreshold,
      hookData
    )

    logger.info('EVM CCTP burn transaction completed', { 
      transactionHash,
      sourceChain: sourceConfig.chainId,
      destinationChain: destinationConfig.chainId,
      hookDataUsed: !!hookData
    })

    return transactionHash
  }

  async completeTransfer(params: CCTPCompletionParams): Promise<string> {
    const { message, attestation, destinationConfig } = params

    logger.info('Completing CCTP transfer on EVM destination chain', {
      destinationChain: destinationConfig.chainId,
      messageLength: message.length,
      attestationLength: attestation.length
    })

    // Create provider and wallet for destination chain
    const provider = new ethers.JsonRpcProvider(destinationConfig.rpcUrl)
    const wallet = new ethers.Wallet(config.evmPrivateKey, provider)

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

    logger.info('EVM CCTP receive message completed', {
      txHash: receiveTx.hash,
      gasUsed: receiveReceipt?.gasUsed?.toString(),
      blockNumber: receiveReceipt?.blockNumber
    })

    return receiveTx.hash
  }

  private async ensureUSDCApproval(
    usdcContract: ethers.Contract,
    walletAddress: string,
    tokenMessengerAddress: string,
    amount: bigint
  ): Promise<void> {
    const currentAllowance = await usdcContract.allowance(walletAddress, tokenMessengerAddress)

    if (currentAllowance < amount) {
      logger.info('Approving USDC for transfer', { 
        currentAllowance: currentAllowance.toString(),
        requiredAmount: amount.toString()
      })

      const approveTx = await usdcContract.approve(tokenMessengerAddress, amount)
      const approveReceipt = await approveTx.wait()

      logger.info('USDC approved for transfer', { 
        txHash: approveTx.hash,
        gasUsed: approveReceipt?.gasUsed?.toString()
      })
    }
  }

  private prepareMintRecipient(destinationAddress: string, destinationChainId: number): string {
    if (isSolanaChain(destinationChainId)) {
      // For Solana destinations, convert the address properly
      try {
        const solanaAddress = new PublicKey(destinationAddress)
        return ethers.hexlify(solanaAddress.toBuffer())
      } catch (error) {
        throw new Error(`Invalid Solana destination address: ${destinationAddress}`)
      }
    } else {
      // For EVM destinations, pad the address to 32 bytes
      return ethers.zeroPadValue(destinationAddress, 32)
    }
  }

  private async executeBurnTransaction(
    sourceConfig: any,
    destinationConfig: any,
    amount: bigint,
    mintRecipient: string,
    destinationCaller: string,
    maxFee: bigint,
    finalityThreshold: number,
    hookData?: string
  ): Promise<string> {
    const provider = new ethers.JsonRpcProvider(sourceConfig.rpcUrl)
    const wallet = new ethers.Wallet(config.evmPrivateKey, provider)

    const tokenMessengerContract = new ethers.Contract(
      sourceConfig.tokenMessengerAddress,
      TokenMessengerV2ABI,
      wallet
    )

    let burnTx: ethers.ContractTransactionResponse

    if (hookData && hookData !== '0x') {
      // Use depositForBurnWithHook if hook data is provided
      logger.info('Executing depositForBurnWithHook with OmniCheckout charity hook', {
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

    logger.info('EVM depositForBurn transaction completed', { 
      txHash: burnTx.hash,
      gasUsed: burnReceipt?.gasUsed?.toString(),
      blockNumber: burnReceipt?.blockNumber
    })

    return burnTx.hash
  }

  /**
   * Generate hook data for charity donation
   * @param charityPercentage Charity percentage in basis points (250 = 2.5%)
   * @returns Hook data string for CCTP transfer
   */
  generateCharityHookData(charityPercentage: number = 250): string {
    return omniCheckoutHookService.generateHookData(charityPercentage)
  }

  /**
   * Check if OmniCheckoutHook is deployed on the destination chain
   * @param chainId The chain ID to check
   * @returns True if hook is deployed
   */
  isHookAvailable(chainId: number): boolean {
    return omniCheckoutHookService.isDeployedOnChain(chainId as any)
  }
}
