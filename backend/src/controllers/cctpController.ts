import { Request, Response, NextFunction } from 'express'
import { ethers } from 'ethers'
import { v4 as uuidv4 } from 'uuid'
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
import { Transaction, ITransaction } from '../models'
import { EVMCCTPService } from '../services/evmCCTPService'
import { SolanaCCTPService } from '../services/solanaCCTPService'
import { CCTPAttestationService } from '../services/attestationService'
import { CCTPStatusService } from '../services/statusService'
import omniCheckoutHookService from '../services/omniCheckoutHookService'

const logger = createLogger('CCTPController')

export class CCTPController {
  private evmService: EVMCCTPService
  private solanaService: SolanaCCTPService
  private attestationService: CCTPAttestationService
  private statusService: CCTPStatusService

  constructor() {
    this.evmService = new EVMCCTPService()
    this.solanaService = new SolanaCCTPService()
    this.attestationService = new CCTPAttestationService()
    this.statusService = new CCTPStatusService()
  }

  async initiateTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const validation = this.validateTransferRequest(transferRequest)
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.error,
          timestamp: new Date().toISOString()
        })
        return
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

      // Auto-generate charity hook data if hook is deployed on destination chain and no hook data provided
      let finalHookData = hookData
      if (!hookData && omniCheckoutHookService.isDeployedOnChain(destinationChain)) {
        finalHookData = omniCheckoutHookService.generateHookData(250) // 2.5% charity donation
        logger.info('Auto-generated charity hook data', { 
          destinationChain,
          hookData: finalHookData
        })
      }

      let transactionHash: string
      let transaction: ITransaction

      // Create transaction record
      const transactionId = sessionId || uuidv4()
      transaction = new Transaction({
        transactionId,
        sourceChain: sourceChain.toString(),
        destinationChain: destinationChain.toString(),
        amount,
        sourceAddress,
        destinationAddress,
        status: 'pending',
        metadata: {
          transferType,
          hookData: finalHookData,
          originalHookData: hookData,
          charityEnabled: !!finalHookData && omniCheckoutHookService.isDeployedOnChain(destinationChain),
          finalityThreshold
        }
      })

      await transaction.save()
      logger.info('Transaction record created', { transactionId })

      try {
        if (isSolanaChain(sourceChain)) {
          // Handle Solana source chain
          transactionHash = await this.solanaService.executeTransfer({
            sourceConfig,
            destinationConfig,
            amount: amountWei,
            destinationAddress,
            finalityThreshold,
            maxFee,
            hookData: finalHookData
          })
        } else {
          // Handle EVM source chain
          transactionHash = await this.evmService.executeTransfer({
            sourceConfig,
            destinationConfig,
            amount: amountWei,
            destinationAddress,
            finalityThreshold,
            maxFee,
            hookData: finalHookData
          })
        }

        // Update transaction with hash
        transaction.transactionHash = transactionHash
        transaction.burnTxHash = transactionHash
        transaction.status = 'confirmed'
        await transaction.save()

        const response: ApiResponse<CCTPTransferResponse> = {
          success: true,
          data: {
            transactionHash,
            sourceChain,
            destinationChain,
            amount,
            status: PaymentStatus.PENDING_BURN,
            sessionId: transactionId
          },
          timestamp: new Date().toISOString()
        }

        res.json(response)
      } catch (transferError) {
        // Update transaction status to failed
        transaction.status = 'failed'
        transaction.metadata = {
          ...transaction.metadata,
          error: transferError instanceof Error ? transferError.message : 'Unknown error'
        }
        await transaction.save()

        logger.error('CCTP transfer failed', { 
          transactionId,
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
  }

  async getAttestation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sourceChain = parseInt(req.params.sourceChain, 10)
      const { txHash } = req.params

      if (!Object.values(SupportedChainId).includes(sourceChain)) {
        res.status(400).json({
          success: false,
          error: 'Invalid source chain',
          timestamp: new Date().toISOString()
        })
        return
      }

      logger.info('Getting CCTP attestation', { sourceChain, txHash })

      const attestationResult = await this.attestationService.getAttestation(sourceChain, txHash)

      // Update transaction with attestation info if we have a transaction record
      const transaction = await Transaction.findOne({ 
        $or: [
          { transactionHash: txHash },
          { burnTxHash: txHash }
        ]
      })

      if (transaction && attestationResult.messageHash) {
        transaction.messageHash = attestationResult.messageHash
        transaction.messageBytes = attestationResult.message
        transaction.attestationHash = attestationResult.attestation
        await transaction.save()
      }

      const response: ApiResponse<AttestationResponse> = {
        success: true,
        data: attestationResult,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      next(error)
    }
  }

  async completeTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        message, 
        attestation, 
        destinationChain, 
        sessionId 
      } = req.body

      if (!message || !attestation || !destinationChain) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: message, attestation, destinationChain',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!Object.values(SupportedChainId).includes(destinationChain)) {
        res.status(400).json({
          success: false,
          error: 'Unsupported destination chain',
          timestamp: new Date().toISOString()
        })
        return
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
        transactionHash = await this.solanaService.completeTransfer({
          message,
          attestation,
          destinationConfig
        })
      } else {
        // Handle EVM destination chain
        transactionHash = await this.evmService.completeTransfer({
          message,
          attestation,
          destinationConfig
        })
      }

      // Update transaction with completion info
      const transaction = await Transaction.findOne({ 
        messageBytes: message 
      })

      if (transaction) {
        transaction.mintTxHash = transactionHash
        transaction.status = 'completed'
        await transaction.save()
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
          sessionId: transaction?.transactionId || sessionId
        },
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      next(error)
    }
  }

  async getMinimumFee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chainId = parseInt(req.params.chainId, 10)
      const amount = req.params.amount

      if (!Object.values(SupportedChainId).includes(chainId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain ID',
          timestamp: new Date().toISOString()
        })
        return
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

      // For EVM chains, return 0 as default (could be enhanced to query actual contract)
      const response: ApiResponse<{ minFee: string, chainId: SupportedChainId }> = {
        success: true,
        data: {
          minFee: '0',
          chainId
        },
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      next(error)
    }
  }

  async getTransferStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sourceChain = parseInt(req.params.sourceChain, 10)
      const { txHash } = req.params
      const { transactionId } = req.query

      if (!Object.values(SupportedChainId).includes(sourceChain) && !transactionId) {
        res.status(400).json({
          success: false,
          error: 'Invalid source chain or missing transaction ID',
          timestamp: new Date().toISOString()
        })
        return
      }

      logger.info('Getting CCTP transfer status', { sourceChain, txHash, transactionId })

      let transaction: ITransaction | null = null

      // First try to find by transaction ID
      if (transactionId) {
        transaction = await Transaction.findOne({ transactionId: transactionId as string })
      }

      // Fall back to finding by transaction hash
      if (!transaction && txHash) {
        transaction = await Transaction.findOne({ 
          $or: [
            { transactionHash: txHash },
            { burnTxHash: txHash },
            { mintTxHash: txHash }
          ]
        })
      }

      if (transaction) {
        // Return status from database
        const response: ApiResponse<{
          transactionId: string
          status: string
          sourceChain: string
          destinationChain: string
          amount: string
          transactionHash?: string
          burnTxHash?: string
          mintTxHash?: string
          messageHash?: string
          createdAt: Date
          updatedAt: Date
        }> = {
          success: true,
          data: {
            transactionId: transaction.transactionId,
            status: transaction.status,
            sourceChain: transaction.sourceChain,
            destinationChain: transaction.destinationChain,
            amount: transaction.amount,
            transactionHash: transaction.transactionHash,
            burnTxHash: transaction.burnTxHash,
            mintTxHash: transaction.mintTxHash,
            messageHash: transaction.messageHash,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
          },
          timestamp: new Date().toISOString()
        }

        res.json(response)
        return
      }

      // Fall back to checking on-chain status
      const statusResult = await this.statusService.getTransferStatus(sourceChain, txHash)

      const response: ApiResponse<typeof statusResult> = {
        success: true,
        data: statusResult,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      next(error)
    }
  }

  async getAllTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        status, 
        sourceChain, 
        destinationChain, 
        limit = 10, 
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query

      const query: any = {}
      
      if (status) query.status = status
      if (sourceChain) query.sourceChain = sourceChain
      if (destinationChain) query.destinationChain = destinationChain

      const sort: any = {}
      sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1

      const transactions = await Transaction.find(query)
        .sort(sort)
        .limit(Number(limit))
        .skip(Number(offset))
        .exec()

      const total = await Transaction.countDocuments(query)

      const response: ApiResponse<{
        transactions: ITransaction[]
        total: number
        limit: number
        offset: number
        hasMore: boolean
      }> = {
        success: true,
        data: {
          transactions,
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total
        },
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      next(error)
    }
  }

  async getTransactionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionId } = req.params

      const transaction = await Transaction.findOne({ transactionId })

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
          timestamp: new Date().toISOString()
        })
        return
      }

      const response: ApiResponse<ITransaction> = {
        success: true,
        data: transaction,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      next(error)
    }
  }

  private validateTransferRequest(request: CCTPTransferRequest): { isValid: boolean; error?: string } {
    const {
      sourceChain,
      destinationChain,
      amount,
      sourceAddress,
      destinationAddress
    } = request

    if (!sourceChain || !destinationChain || !amount || !sourceAddress || !destinationAddress) {
      return { isValid: false, error: 'Missing required fields' }
    }

    if (!Object.values(SupportedChainId).includes(sourceChain) || 
        !Object.values(SupportedChainId).includes(destinationChain)) {
      return { isValid: false, error: 'Unsupported chain' }
    }

    if (sourceChain === destinationChain) {
      return { isValid: false, error: 'Source and destination chains must be different' }
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return { isValid: false, error: 'Invalid amount' }
    }

    return { isValid: true }
  }
}
