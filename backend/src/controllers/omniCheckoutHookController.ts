import { Request, Response } from 'express'
import { createLogger } from '../utils/logger'
import omniCheckoutHookService from '../services/omniCheckoutHookService'
import { SupportedChainId } from '../types'
import { isValidChainId } from '../config/chains'

const logger = createLogger('OmniCheckoutHookController')

export class OmniCheckoutHookController {
  /**
   * Get charity configuration for a specific chain
   */
  async getCharityConfig(req: Request, res: Response): Promise<void> {
    try {
      const { chainId } = req.params
      const chainIdNum = parseInt(chainId, 10)

      if (!isValidChainId(chainIdNum)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain ID',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!omniCheckoutHookService.isDeployedOnChain(chainIdNum)) {
        res.status(404).json({
          success: false,
          error: 'OmniCheckoutHook not deployed on this chain',
          timestamp: new Date().toISOString()
        })
        return
      }

      const config = await omniCheckoutHookService.getCharityConfig(chainIdNum)

      res.json({
        success: true,
        data: {
          chainId: chainIdNum,
          ...config
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Failed to get charity config', { error, params: req.params })
      res.status(500).json({
        success: false,
        error: 'Failed to get charity configuration',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Update charity configuration (owner only)
   */
  async updateCharityConfig(req: Request, res: Response): Promise<void> {
    try {
      const { chainId } = req.params
      const { charityAddress, charityPercentage } = req.body

      const chainIdNum = parseInt(chainId, 10)

      if (!isValidChainId(chainIdNum)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain ID',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!charityAddress || typeof charityPercentage !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: charityAddress, charityPercentage',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (charityPercentage < 0 || charityPercentage > 1000) {
        res.status(400).json({
          success: false,
          error: 'Charity percentage must be between 0 and 1000 basis points (0-10%)',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!omniCheckoutHookService.isDeployedOnChain(chainIdNum)) {
        res.status(404).json({
          success: false,
          error: 'OmniCheckoutHook not deployed on this chain',
          timestamp: new Date().toISOString()
        })
        return
      }

      const transactionHash = await omniCheckoutHookService.updateCharityConfig(
        chainIdNum,
        charityAddress,
        charityPercentage
      )

      res.json({
        success: true,
        data: {
          transactionHash,
          chainId: chainIdNum,
          charityAddress,
          charityPercentage
        },
        message: 'Charity configuration updated successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Failed to update charity config', { error, params: req.params, body: req.body })
      
      // Check if it's an owner-only error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const statusCode = errorMessage.includes('Ownable') ? 403 : 500
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 403 ? 'Only contract owner can update charity configuration' : 'Failed to update charity configuration',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Calculate charity amount for a given transfer
   */
  async calculateCharityAmount(req: Request, res: Response): Promise<void> {
    try {
      const { chainId } = req.params
      const { amount } = req.query

      const chainIdNum = parseInt(chainId, 10)

      if (!isValidChainId(chainIdNum)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain ID',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!amount || typeof amount !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Missing required query parameter: amount',
          timestamp: new Date().toISOString()
        })
        return
      }

      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be a positive number',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!omniCheckoutHookService.isDeployedOnChain(chainIdNum)) {
        res.status(404).json({
          success: false,
          error: 'OmniCheckoutHook not deployed on this chain',
          timestamp: new Date().toISOString()
        })
        return
      }

      const result = await omniCheckoutHookService.calculateCharityAmount(chainIdNum, amount)

      res.json({
        success: true,
        data: {
          chainId: chainIdNum,
          inputAmount: amount,
          ...result
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Failed to calculate charity amount', { error, params: req.params, query: req.query })
      res.status(500).json({
        success: false,
        error: 'Failed to calculate charity amount',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Generate hook data for charity transfers
   */
  async generateHookData(req: Request, res: Response): Promise<void> {
    try {
      const { charityPercentage = 250 } = req.query

      const percentageNum = parseInt(charityPercentage as string, 10)

      if (isNaN(percentageNum) || percentageNum < 0 || percentageNum > 1000) {
        res.status(400).json({
          success: false,
          error: 'Charity percentage must be between 0 and 1000 basis points (0-10%)',
          timestamp: new Date().toISOString()
        })
        return
      }

      const hookData = omniCheckoutHookService.generateHookData(percentageNum)

      res.json({
        success: true,
        data: {
          hookData,
          charityPercentage: percentageNum,
          charityPercentageFormatted: `${(percentageNum / 100).toFixed(2)}%`
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Failed to generate hook data', { error, query: req.query })
      res.status(500).json({
        success: false,
        error: 'Failed to generate hook data',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Get contract owner for a specific chain
   */
  async getOwner(req: Request, res: Response): Promise<void> {
    try {
      const { chainId } = req.params
      const chainIdNum = parseInt(chainId, 10)

      if (!isValidChainId(chainIdNum)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain ID',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!omniCheckoutHookService.isDeployedOnChain(chainIdNum)) {
        res.status(404).json({
          success: false,
          error: 'OmniCheckoutHook not deployed on this chain',
          timestamp: new Date().toISOString()
        })
        return
      }

      const owner = await omniCheckoutHookService.getOwner(chainIdNum)

      res.json({
        success: true,
        data: {
          chainId: chainIdNum,
          owner
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Failed to get contract owner', { error, params: req.params })
      res.status(500).json({
        success: false,
        error: 'Failed to get contract owner',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Get deployment status and addresses
   */
  async getDeploymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const deployedAddresses = omniCheckoutHookService.getDeployedAddresses()
      const healthCheck = await omniCheckoutHookService.healthCheck()

      res.json({
        success: true,
        data: {
          deployedAddresses,
          ...healthCheck
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Failed to get deployment status', { error })
      res.status(500).json({
        success: false,
        error: 'Failed to get deployment status',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Execute hook manually (for testing purposes)
   */
  async executeHook(req: Request, res: Response): Promise<void> {
    try {
      const { chainId } = req.params
      const { recipient, amount, messageHash } = req.body

      const chainIdNum = parseInt(chainId, 10)

      if (!isValidChainId(chainIdNum)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain ID',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!recipient || !amount || !messageHash) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: recipient, amount, messageHash',
          timestamp: new Date().toISOString()
        })
        return
      }

      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be a positive number',
          timestamp: new Date().toISOString()
        })
        return
      }

      if (!omniCheckoutHookService.isDeployedOnChain(chainIdNum)) {
        res.status(404).json({
          success: false,
          error: 'OmniCheckoutHook not deployed on this chain',
          timestamp: new Date().toISOString()
        })
        return
      }

      const execution = await omniCheckoutHookService.executeHook(
        chainIdNum,
        recipient,
        amount,
        messageHash
      )

      res.json({
        success: true,
        data: {
          chainId: chainIdNum,
          ...execution
        },
        message: 'Hook executed successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Failed to execute hook', { error, params: req.params, body: req.body })
      res.status(500).json({
        success: false,
        error: 'Failed to execute hook',
        timestamp: new Date().toISOString()
      })
    }
  }
}

export default new OmniCheckoutHookController()
