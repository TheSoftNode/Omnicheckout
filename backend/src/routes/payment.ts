import { Router } from 'express'
import paymentController from '../controllers/paymentController'
import { rateLimiterMiddleware } from '../middleware/rateLimiter'
import { validateApiKey } from '../middleware/auth'

const router = Router()

// Apply middleware
router.use(validateApiKey)
router.use(rateLimiterMiddleware)

// Payment Session Routes
router.post('/sessions', paymentController.createPaymentSession.bind(paymentController))
router.get('/sessions/:sessionId', paymentController.getPaymentSession.bind(paymentController))
router.put('/sessions/:sessionId', paymentController.updatePaymentSession.bind(paymentController))
router.get('/sessions', paymentController.listPaymentSessions.bind(paymentController))

// Circle API Integration Routes
router.post('/circle/payments', paymentController.createCirclePayment.bind(paymentController))
router.get('/circle/payments/:paymentId', paymentController.getCirclePayment.bind(paymentController))
router.post('/circle/transfers', paymentController.createCircleTransfer.bind(paymentController))
router.post('/circle/payouts', paymentController.createCirclePayout.bind(paymentController))

// USDC Transfer Routes
router.post('/usdc/transfer', paymentController.initiateUSDCTransfer.bind(paymentController))

// Analytics and Quotes Routes
router.get('/analytics/:merchantId', paymentController.getPaymentAnalytics.bind(paymentController))
router.get('/quotes', paymentController.getPaymentQuote.bind(paymentController))

// Merchant Settings Routes
router.get('/merchants/:merchantId/settings', paymentController.getMerchantSettings.bind(paymentController))
router.put('/merchants/:merchantId/settings', paymentController.updateMerchantSettings.bind(paymentController))

// Health Check Route
router.get('/health', paymentController.healthCheck.bind(paymentController))

export { router as paymentRoutes }
