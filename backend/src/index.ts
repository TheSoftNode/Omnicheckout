import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createLogger } from './utils/logger'
import { database } from './config/database'
import { errorHandler } from './middleware/errorHandler'
import { rateLimiterMiddleware } from './middleware/rateLimiter'
import { paymentRoutes } from './routes/payment'
import { cctpRoutes } from './routes/cctp'
import { chainRoutes } from './routes/chains'
import { webhookRoutes } from './routes/webhooks'
import hooksRoutes from './routes/hooks'
import { updateDeployedAddresses } from './utils/updateDeployedAddresses'

// Load environment variables
dotenv.config()

const app = express()
const logger = createLogger('Server')

// Update deployed contract addresses on startup
updateDeployedAddresses()

// Initialize database connection
const initializeDatabase = async () => {
  try {
    await database.connect()
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error('Failed to connect to database:', error)
    process.exit(1)
  }
}

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))

// Rate limiting
app.use(rateLimiterMiddleware)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    database: database.getConnectionStatus() ? 'connected' : 'disconnected'
  })
})

// API routes
app.use('/api/payment', paymentRoutes)
app.use('/api/cctp', cctpRoutes)
app.use('/api/chains', chainRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/hooks', hooksRoutes)

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

const startServer = async () => {
  await initializeDatabase()
  
  app.listen(PORT, () => {
    logger.info(`OmniCheckout Backend Server running on port ${PORT}`)
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await database.disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await database.disconnect()
  process.exit(0)
})

startServer().catch((error) => {
  logger.error('Failed to start server:', error)
  process.exit(1)
})

export default app
