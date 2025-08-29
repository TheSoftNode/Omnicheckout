import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../types'
import { createLogger } from '../utils/logger'

const logger = createLogger('ErrorHandler')

export interface AppError extends Error {
  statusCode: number
  isOperational: boolean
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError
  error.statusCode = statusCode
  error.isOperational = true
  return error
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = err

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Invalid input data'
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  // Log error
  logger.error('Error occurred', {
    error: {
      message: err.message,
      stack: err.stack,
      statusCode
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }
  })

  // Send error response
  const response: ApiResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    response.error = 'Internal server error'
  }

  res.status(statusCode).json(response)
}
