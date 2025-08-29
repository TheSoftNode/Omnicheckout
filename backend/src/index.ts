import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createLogger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { rateLimiter } from './middleware/rateLimiter'
import { paymentRoutes } from './routes/payment'
import { cctpRoutes } from './routes/cctp'
import { chainRoutes } from './routes/chains'
import { webhookRoutes } from './routes/webhooks'

// Load environment variables
dotenv.config()

const app = express()
const logger = createLogger('Server')

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))

// Rate limiting
app.use(rateLimiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API routes
app.use('/api/payment', paymentRoutes)
app.use('/api/cctp', cctpRoutes)
app.use('/api/chains', chainRoutes)
app.use('/api/webhooks', webhookRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  })
})

// Error handling middleware
app.use(errorHandler)

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  logger.info(`OmniCheckout Backend Server running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
