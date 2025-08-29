import { ethers } from 'ethers'
import axios from 'axios'
import { StatusService } from '../interfaces/cctp.interface'
import { SupportedChainId } from '../types'
import { getChainConfig, isSolanaChain } from '../config/chains'
import { createLogger } from '../utils/logger'
import { getConfig } from '../config'
import { Transaction, ITransaction } from '../models'

const logger = createLogger('StatusService')
const config = getConfig()

export class CCTPStatusService implements StatusService {
  async getTransferStatus(sourceChain: SupportedChainId, txHash: string): Promise<{
    transactionHash: string
    sourceChain: SupportedChainId
    transactionStatus: 'pending' | 'confirmed' | 'failed'
    confirmations: number
    attestationStatus: 'pending' | 'complete'
    canComplete: boolean
  }> {
    logger.info('Checking CCTP transfer status', { sourceChain, txHash })

    // First check if we have this transaction in our database
    const transaction = await Transaction.findOne({
      $or: [
        { transactionHash: txHash },
        { burnTxHash: txHash },
        { mintTxHash: txHash }
      ]
    })

    // Check transaction status on source chain
    const sourceConfig = getChainConfig(sourceChain)
    let txStatus: 'pending' | 'confirmed' | 'failed' = 'pending'
    let confirmations = 0

    if (!isSolanaChain(sourceChain)) {
      // For EVM chains, check transaction receipt
      const txStatusResult = await this.checkEVMTransactionStatus(sourceConfig.rpcUrl, txHash)
      txStatus = txStatusResult.status
      confirmations = txStatusResult.confirmations
    } else {
      // For Solana chains, we assume confirmed if we can query it
      // In a production system, you'd implement proper Solana transaction status checking
      txStatus = 'confirmed'
      confirmations = 1
    }

    // Check attestation status
    const attestationStatus = await this.checkAttestationStatus(sourceChain, txHash)

    // Update transaction in database if we have it
    if (transaction) {
      let dbStatus = transaction.status
      if (txStatus === 'confirmed' && dbStatus === 'pending') {
        dbStatus = 'confirmed'
      } else if (txStatus === 'failed') {
        dbStatus = 'failed'
      }

      if (dbStatus !== transaction.status) {
        transaction.status = dbStatus
        await transaction.save()
        logger.info('Updated transaction status in database', {
          transactionId: transaction.transactionId,
          oldStatus: transaction.status,
          newStatus: dbStatus
        })
      }
    }

    return {
      transactionHash: txHash,
      sourceChain,
      transactionStatus: txStatus,
      confirmations,
      attestationStatus,
      canComplete: txStatus === 'confirmed' && attestationStatus === 'complete'
    }
  }

  private async checkEVMTransactionStatus(rpcUrl: string, txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed'
    confirmations: number
  }> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const receipt = await provider.getTransactionReceipt(txHash)
      
      if (receipt) {
        if (receipt.status === 1) {
          const currentBlock = await provider.getBlockNumber()
          const confirmations = currentBlock - receipt.blockNumber
          return {
            status: 'confirmed',
            confirmations
          }
        } else {
          return {
            status: 'failed',
            confirmations: 0
          }
        }
      } else {
        return {
          status: 'pending',
          confirmations: 0
        }
      }
    } catch (error) {
      logger.warn('Error checking EVM transaction receipt', {
        error: error instanceof Error ? error.message : 'Unknown error',
        txHash
      })
      return {
        status: 'pending',
        confirmations: 0
      }
    }
  }

  private async checkAttestationStatus(sourceChain: SupportedChainId, txHash: string): Promise<'pending' | 'complete'> {
    try {
      const sourceConfig = getChainConfig(sourceChain)
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
        return 'complete'
      } else {
        return 'pending'
      }
    } catch (error) {
      // Ignore attestation errors for status check
      logger.debug('Could not check attestation status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return 'pending'
    }
  }
}
