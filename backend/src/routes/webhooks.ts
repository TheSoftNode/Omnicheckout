import { Router } from 'express'
import { CircleWebhookPayload, ApiResponse } from '../types'
import { createLogger } from '../utils/logger'

const router = Router()
const logger = createLogger('WebhookRoutes')

// Circle webhook endpoint
router.post('/circle', async (req, res, next) => {
  try {
    const payload: CircleWebhookPayload = req.body

    logger.info('Received Circle webhook', { 
      id: payload.id,
      type: payload.type,
      transactionHash: payload.data?.transactionHash 
    })

    // Verify webhook signature (implement proper verification in production)
    // const signature = req.headers['x-circle-signature']
    // if (!verifyWebhookSignature(payload, signature)) {
    //   return res.status(401).json({ error: 'Invalid signature' })
    // }

    // Process webhook based on type
    switch (payload.type) {
      case 'transaction.confirmed':
        await handleTransactionConfirmed(payload)
        break
      case 'transfer.completed':
        await handleTransferCompleted(payload)
        break
      case 'transfer.failed':
        await handleTransferFailed(payload)
        break
      default:
        logger.info('Unhandled webhook type', { type: payload.type })
    }

    const response: ApiResponse<{ received: boolean }> = {
      success: true,
      data: { received: true },
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

// Webhook handlers
async function handleTransactionConfirmed(payload: CircleWebhookPayload) {
  logger.info('Transaction confirmed', { 
    transactionHash: payload.data.transactionHash,
    amount: payload.data.amount 
  })
  
  // Update payment session status
  // In a real implementation, you'd query your database and update the session
}

async function handleTransferCompleted(payload: CircleWebhookPayload) {
  logger.info('Transfer completed', { 
    transactionHash: payload.data.transactionHash,
    amount: payload.data.amount 
  })
  
  // Update payment session to completed status
  // Send notification to merchant
}

async function handleTransferFailed(payload: CircleWebhookPayload) {
  logger.error('Transfer failed', { 
    transactionHash: payload.data.transactionHash,
    error: payload.data 
  })
  
  // Update payment session to failed status
  // Send notification to merchant
}

// Health check for webhooks
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'webhooks',
    timestamp: new Date().toISOString()
  })
})

export { router as webhookRoutes }
