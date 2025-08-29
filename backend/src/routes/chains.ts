import { Router } from 'express'
import { ChainController } from '../controllers/chainController'

const router = Router()
const chainController = new ChainController()

/**
 * Production-ready Chain Routes
 * Provides comprehensive chain information, balance checking, and transaction status
 * with robust error handling and validation
 */

// Get all supported chains
router.get('/', chainController.getSupportedChains.bind(chainController))

// Get specific chain information
router.get('/:chainId', chainController.getChainInfo.bind(chainController))

// Get USDC balance for an address on a specific chain
router.get('/:chainId/balance/:address', chainController.getBalance.bind(chainController))

// Get transaction status for a specific transaction
router.get('/:chainId/transaction/:txHash', chainController.getTransactionStatus.bind(chainController))

// Get chain health status
router.get('/:chainId/health', chainController.healthCheck.bind(chainController))

export { router as chainRoutes }
