// Copyright (c) 2025, Circle Technologies, LLC. All rights reserved.
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from 'express'
import { createLogger } from '../utils/logger'

const logger = createLogger('AuthMiddleware')

// API Key validation middleware
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  // Skip auth for webhook endpoints
  if (req.path.includes('/webhooks')) {
    return next()
  }

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'API key is required. Include in X-API-Key header or Authorization header',
      timestamp: new Date().toISOString()
    })
    return
  }

  // In production, validate against stored API keys
  // For now, just check it exists and has proper format
  if (typeof apiKey !== 'string' || apiKey.length < 10) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key format',
      timestamp: new Date().toISOString()
    })
    return
  }

  // Add API key to request for logging/analytics
  req.apiKey = apiKey as string

  logger.debug('API key validated', { 
    keyPrefix: apiKey.substring(0, 8) + '...',
    path: req.path,
    method: req.method
  })

  next()
}

// Merchant ID validation middleware
export const validateMerchantId = (req: Request, res: Response, next: NextFunction): void => {
  const merchantId = req.params.merchantId || req.body.merchantId

  if (!merchantId) {
    res.status(400).json({
      success: false,
      error: 'Merchant ID is required',
      timestamp: new Date().toISOString()
    })
    return
  }

  // Basic UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(merchantId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid merchant ID format',
      timestamp: new Date().toISOString()
    })
    return
  }

  next()
}

// Role-based access control middleware
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // In production, check user roles from JWT or database
    // For now, allow all authenticated requests
    next()
  }
}

// Session validation middleware
export const validateSession = (req: Request, res: Response, next: NextFunction): void => {
  const sessionId = req.params.sessionId

  if (!sessionId) {
    res.status(400).json({
      success: false,
      error: 'Session ID is required',
      timestamp: new Date().toISOString()
    })
    return
  }

  // Basic UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(sessionId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid session ID format',
      timestamp: new Date().toISOString()
    })
    return
  }

  next()
}

// Extend Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      apiKey?: string
      user?: {
        id: string
        role: string
        merchantId?: string
      }
    }
  }
}
