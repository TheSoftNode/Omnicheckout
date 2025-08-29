import axios from 'axios'
import { AttestationService } from '../interfaces/cctp.interface'
import { SupportedChainId } from '../types'
import { getChainConfig } from '../config/chains'
import { createLogger } from '../utils/logger'
import { getConfig } from '../config'
import { Transaction } from '../models'

const logger = createLogger('AttestationService')
const config = getConfig()

export class CCTPAttestationService implements AttestationService {
  async getAttestation(sourceChain: SupportedChainId, txHash: string): Promise<{
    status: 'pending' | 'complete'
    transactionHash: string
    attestation?: string
    message?: string
    messageHash?: string
  }> {
    // First check if we already have the attestation cached in database
    const transaction = await Transaction.findOne({
      $or: [
        { transactionHash: txHash },
        { burnTxHash: txHash }
      ]
    })

    if (transaction?.attestationHash && transaction?.messageBytes) {
      logger.info('Found cached attestation in database', { 
        transactionId: transaction.transactionId,
        txHash 
      })
      
      return {
        status: 'complete',
        transactionHash: txHash,
        attestation: transaction.attestationHash,
        message: transaction.messageBytes,
        messageHash: transaction.messageHash
      }
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
        
        const result = {
          status: message.status === 'complete' ? 'complete' as const : 'pending' as const,
          transactionHash: txHash
        }

        if (message.status === 'complete') {
          logger.info('Attestation complete', { 
            txHash,
            hasAttestation: !!message.attestation,
            hasMessage: !!message.message
          })

          // Cache the attestation in database if we have the transaction
          if (transaction && message.attestation && message.message) {
            transaction.attestationHash = message.attestation
            transaction.messageBytes = message.message
            transaction.messageHash = message.messageHash
            await transaction.save()
            
            logger.info('Cached attestation in database', { 
              transactionId: transaction.transactionId 
            })
          }

          return {
            ...result,
            attestation: message.attestation,
            message: message.message,
            messageHash: message.messageHash
          }
        } else {
          logger.info('Attestation pending', { 
            txHash,
            status: message.status
          })

          return result
        }
      } else {
        // Message not found yet
        logger.info('Message not found in IRIS API response', { txHash })
        
        return {
          status: 'pending',
          transactionHash: txHash
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          // Message not found yet, return pending status
          logger.info('Message not found (404), returning pending status', { txHash })
          
          return {
            status: 'pending',
            transactionHash: txHash
          }
        } else {
          logger.error('IRIS API error', { 
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            txHash
          })
          throw new Error(`IRIS API error: ${error.response?.status} ${error.response?.statusText}`)
        }
      } else {
        logger.error('Non-Axios error querying IRIS API', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          txHash
        })
        throw error
      }
    }
  }
}
