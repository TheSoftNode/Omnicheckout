import { AppConfig } from '../types'

export const getConfig = (): AppConfig => {
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    circleApiKey: process.env.CIRCLE_API_KEY || '',
    circleEntitySecret: process.env.CIRCLE_ENTITY_SECRET || '',
    evmPrivateKey: process.env.EVM_PRIVATE_KEY || '',
    solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY || '',
    irisApiUrl: process.env.IRIS_API_URL || 'https://iris-api-sandbox.circle.com',
    databaseUrl: process.env.DATABASE_URL || 'sqlite:./data/omnicheckout.db',
    webhookSecret: process.env.WEBHOOK_SECRET || 'default-webhook-secret',
    logLevel: process.env.LOG_LEVEL || 'info',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10),
    defaultFeePercentage: parseFloat(process.env.DEFAULT_FEE_PERCENTAGE || '0.01')
  }
}

export const validateConfig = (config: AppConfig): void => {
  const requiredFields = [
    'circleApiKey',
    'circleEntitySecret',
    'evmPrivateKey'
  ]

  for (const field of requiredFields) {
    if (!config[field as keyof AppConfig]) {
      throw new Error(`Missing required environment variable: ${field}`)
    }
  }

  if (config.port < 1 || config.port > 65535) {
    throw new Error('PORT must be between 1 and 65535')
  }

  if (config.defaultFeePercentage < 0 || config.defaultFeePercentage > 1) {
    throw new Error('DEFAULT_FEE_PERCENTAGE must be between 0 and 1')
  }
}
