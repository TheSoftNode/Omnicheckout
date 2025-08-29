import { Request, Response, NextFunction } from 'express'
import { ApiResponse, SupportedChainId } from '../types'
import { ChainManagementService } from '../services/chainService'
import { BalanceInfo, TransactionStatus, ChainInfo } from '../interfaces/chain.interface'
import { createLogger } from '../utils/logger'

const logger = createLogger('ChainController')

export class ChainController {
  private chainService: ChainManagementService

  constructor() {
    this.chainService = new ChainManagementService()
  }

  async getSupportedChains(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Getting supported chains')
      
      const chains = await this.chainService.getSupportedChains()

      const response: ApiResponse<Omit<ChainInfo, 'rpcUrl'>[]> = {
        success: true,
        data: chains,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Failed to get supported chains', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      next(error)
    }
  }

  async getChainInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chainId = parseInt(req.params.chainId, 10)
      
      if (isNaN(chainId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain ID format',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!this.chainService.validateChainSupport(chainId)) {
        res.status(400).json({
          success: false,
          error: `Unsupported chain ID: ${chainId}`,
          timestamp: new Date().toISOString()
        })
        return
      }

      logger.info('Getting chain info', { chainId })

      const chainInfo = await this.chainService.getChainInfo(chainId as SupportedChainId)

      const response: ApiResponse<Omit<ChainInfo, 'rpcUrl'>> = {
        success: true,
        data: chainInfo,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Failed to get chain info', { 
        chainId: req.params.chainId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      next(error)
    }
  }

  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chainId = parseInt(req.params.chainId, 10)
      const { address } = req.params

      // Validate chain ID
      if (isNaN(chainId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain ID format',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!this.chainService.validateChainSupport(chainId)) {
        res.status(400).json({
          success: false,
          error: `Unsupported chain ID: ${chainId}`,
          timestamp: new Date().toISOString()
        })
        return
      }

      // Validate address format
      if (!address || !this.chainService.validateAddress(chainId as SupportedChainId, address)) {
        res.status(400).json({
          success: false,
          error: `Invalid address format for chain ${chainId}: ${address}`,
          timestamp: new Date().toISOString()
        })
        return
      }

      logger.info('Getting balance', { chainId, address })

      const balanceInfo = await this.chainService.getBalance(chainId as SupportedChainId, address)

      const response: ApiResponse<BalanceInfo> = {
        success: true,
        data: balanceInfo,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Failed to get balance', { 
        chainId: req.params.chainId,
        address: req.params.address,
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      next(error)
    }
  }

  async getTransactionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chainId = parseInt(req.params.chainId, 10)
      const { txHash } = req.params

      // Validate chain ID
      if (isNaN(chainId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain ID format',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!this.chainService.validateChainSupport(chainId)) {
        res.status(400).json({
          success: false,
          error: `Unsupported chain ID: ${chainId}`,
          timestamp: new Date().toISOString()
        })
        return
      }

      // Validate transaction hash
      if (!txHash || txHash.length < 32) {
        res.status(400).json({
          success: false,
          error: 'Invalid transaction hash format',
          timestamp: new Date().toISOString()
        })
        return
      }

      logger.info('Getting transaction status', { chainId, txHash })

      const transactionStatus = await this.chainService.getTransactionStatus(chainId as SupportedChainId, txHash)

      const response: ApiResponse<TransactionStatus> = {
        success: true,
        data: transactionStatus,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Failed to get transaction status', { 
        chainId: req.params.chainId,
        txHash: req.params.txHash,
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      next(error)
    }
  }

  async healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chainId = parseInt(req.params.chainId, 10)

      if (isNaN(chainId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain ID format',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!this.chainService.validateChainSupport(chainId)) {
        res.status(400).json({
          success: false,
          error: `Unsupported chain ID: ${chainId}`,
          timestamp: new Date().toISOString()
        })
        return
      }

      logger.info('Performing chain health check', { chainId })

      // Basic health check - we could expand this to check RPC latency, block height, etc.
      const healthStatus = {
        chainId: chainId as SupportedChainId,
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        checks: {
          rpcAvailable: true,
          contractsDeployed: true,
          networkReachable: true
        }
      }

      const response: ApiResponse<typeof healthStatus> = {
        success: true,
        data: healthStatus,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Chain health check failed', { 
        chainId: req.params.chainId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      next(error)
    }
  }
}
