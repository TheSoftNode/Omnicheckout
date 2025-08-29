import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { ApiResponse, PaymentSession, PaymentStatus, SupportedChainId } from '../types'
import { createLogger } from '../utils/logger'

const router = Router()
const logger = createLogger('PaymentRoutes')

// In-memory storage for demo (use database in production)
const paymentSessions = new Map<string, PaymentSession>()

// Create payment session
router.post('/session', async (req, res, next) => {
  try {
    const { 
      merchantId, 
      merchantWalletAddress, 
      preferredChain, 
      amount,
      metadata 
    } = req.body

    // Validate required fields
    if (!merchantId || !merchantWalletAddress || !preferredChain || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: merchantId, merchantWalletAddress, preferredChain, amount',
        timestamp: new Date().toISOString()
      })
    }

    // Validate amount
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number',
        timestamp: new Date().toISOString()
      })
    }

    // Create payment session
    const sessionId = uuidv4()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes

    const session: PaymentSession = {
      sessionId,
      merchantId,
      merchantWalletAddress,
      preferredChain: parseInt(preferredChain),
      destinationChain: parseInt(preferredChain),
      amount: amount.toString(),
      status: PaymentStatus.CREATED,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      metadata
    }

    paymentSessions.set(sessionId, session)

    logger.info('Payment session created', { sessionId, merchantId, amount })

    const response: ApiResponse<PaymentSession> = {
      success: true,
      data: session,
      timestamp: new Date().toISOString()
    }

    res.status(201).json(response)
  } catch (error) {
    next(error)
  }
})

// Get payment session
router.get('/session/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params

    const session = paymentSessions.get(sessionId)
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Payment session not found',
        timestamp: new Date().toISOString()
      })
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      session.status = PaymentStatus.EXPIRED
      session.updatedAt = new Date()
      paymentSessions.set(sessionId, session)
    }

    const response: ApiResponse<PaymentSession> = {
      success: true,
      data: session,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

// Update payment session
router.put('/session/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params
    const updates = req.body

    const session = paymentSessions.get(sessionId)
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Payment session not found',
        timestamp: new Date().toISOString()
      })
    }

    // Update allowed fields
    const allowedUpdates = [
      'sourceChain',
      'customerAddress',
      'status',
      'transactionHash',
      'attestationHash',
      'mintTransactionHash',
      'metadata'
    ]

    for (const key of Object.keys(updates)) {
      if (allowedUpdates.includes(key)) {
        (session as any)[key] = updates[key]
      }
    }

    session.updatedAt = new Date()
    paymentSessions.set(sessionId, session)

    logger.info('Payment session updated', { sessionId, updates })

    const response: ApiResponse<PaymentSession> = {
      success: true,
      data: session,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

// List payment sessions for a merchant
router.get('/sessions', async (req, res, next) => {
  try {
    const { merchantId, status, limit = '10', offset = '0' } = req.query

    let sessions = Array.from(paymentSessions.values())

    // Filter by merchant
    if (merchantId) {
      sessions = sessions.filter(s => s.merchantId === merchantId)
    }

    // Filter by status
    if (status) {
      sessions = sessions.filter(s => s.status === status)
    }

    // Sort by creation date (newest first)
    sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Pagination
    const limitNum = parseInt(limit as string, 10)
    const offsetNum = parseInt(offset as string, 10)
    const paginatedSessions = sessions.slice(offsetNum, offsetNum + limitNum)

    const response: ApiResponse<{
      sessions: PaymentSession[]
      total: number
      limit: number
      offset: number
    }> = {
      success: true,
      data: {
        sessions: paginatedSessions,
        total: sessions.length,
        limit: limitNum,
        offset: offsetNum
      },
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

export { router as paymentRoutes }
