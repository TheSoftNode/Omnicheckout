import express from 'express'
import omniCheckoutHookController from '../controllers/omniCheckoutHookController'

const router = express.Router()

/**
 * @route GET /api/hooks/charity/:chainId/config
 * @desc Get charity configuration for a specific chain
 * @access Public
 */
router.get('/charity/:chainId/config', omniCheckoutHookController.getCharityConfig)

/**
 * @route PUT /api/hooks/charity/:chainId/config
 * @desc Update charity configuration (owner only)
 * @access Private (contract owner only)
 */
router.put('/charity/:chainId/config', omniCheckoutHookController.updateCharityConfig)

/**
 * @route GET /api/hooks/charity/:chainId/calculate
 * @desc Calculate charity amount for a given transfer
 * @query amount - Transfer amount in USDC
 * @access Public
 */
router.get('/charity/:chainId/calculate', omniCheckoutHookController.calculateCharityAmount)

/**
 * @route GET /api/hooks/charity/generate-data
 * @desc Generate hook data for charity transfers
 * @query charityPercentage - Charity percentage in basis points (optional, default: 250)
 * @access Public
 */
router.get('/charity/generate-data', omniCheckoutHookController.generateHookData)

/**
 * @route GET /api/hooks/charity/:chainId/owner
 * @desc Get contract owner for a specific chain
 * @access Public
 */
router.get('/charity/:chainId/owner', omniCheckoutHookController.getOwner)

/**
 * @route GET /api/hooks/charity/status
 * @desc Get deployment status and addresses
 * @access Public
 */
router.get('/charity/status', omniCheckoutHookController.getDeploymentStatus)

/**
 * @route POST /api/hooks/charity/:chainId/execute
 * @desc Execute hook manually (for testing purposes)
 * @access Private (contract owner only)
 */
router.post('/charity/:chainId/execute', omniCheckoutHookController.executeHook)

export default router
