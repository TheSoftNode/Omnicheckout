import { Request, Response, NextFunction } from 'express';
import * as winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * Middleware to capture raw body for webhook signature verification
 */
export const captureRawBody = (req: Request, res: Response, next: NextFunction): void => {
  let rawBody = '';
  
  req.on('data', (chunk) => {
    rawBody += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      (req as any).rawBody = rawBody;
      if (rawBody) {
        req.body = JSON.parse(rawBody);
      }
      next();
    } catch (error) {
      logger.error('Failed to parse webhook body', { error });
      res.status(400).json({
        success: false,
        message: 'Invalid JSON in request body'
      });
    }
  });
};

/**
 * Middleware to validate webhook headers
 */
export const validateWebhookHeaders = (req: Request, res: Response, next: NextFunction): void => {
  const signature = req.headers['x-circle-signature'];
  const keyId = req.headers['x-circle-key-id'];
  const contentType = req.headers['content-type'];

  // Check for required headers
  if (!signature || !keyId) {
    logger.warn('Webhook request missing required headers', {
      hasSignature: !!signature,
      hasKeyId: !!keyId,
      userAgent: req.headers['user-agent']
    });

    res.status(400).json({
      success: false,
      message: 'Missing required webhook headers'
    });
    return;
  }

  // Check content type
  if (!contentType || !contentType.includes('application/json')) {
    logger.warn('Webhook request with invalid content type', {
      contentType,
      expectedContentType: 'application/json'
    });

    res.status(400).json({
      success: false,
      message: 'Invalid content type. Expected application/json'
    });
    return;
  }

  next();
};

/**
 * Middleware to validate webhook notification structure
 */
export const validateWebhookNotification = (req: Request, res: Response, next: NextFunction): void => {
  const notification = req.body;

  // Check required fields
  const requiredFields = [
    'subscriptionId',
    'notificationId', 
    'notificationType',
    'notification',
    'timestamp',
    'version'
  ];

  const missingFields = requiredFields.filter(field => !notification[field]);

  if (missingFields.length > 0) {
    logger.warn('Webhook notification missing required fields', {
      missingFields,
      notificationId: notification.notificationId
    });

    res.status(400).json({
      success: false,
      message: 'Missing required notification fields',
      missingFields
    });
    return;
  }

  // Validate version
  if (typeof notification.version !== 'number' || notification.version < 1) {
    res.status(400).json({
      success: false,
      message: 'Invalid notification version'
    });
    return;
  }

  // Validate timestamp format
  try {
    new Date(notification.timestamp);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid timestamp format'
    });
    return;
  }

  next();
};

/**
 * Middleware for webhook request logging
 */
export const logWebhookRequest = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  logger.info('Webhook request received', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    contentLength: req.headers['content-length'],
    notificationId: req.body?.notificationId,
    notificationType: req.body?.notificationType,
    subscriptionId: req.body?.subscriptionId
  });

  // Log response when it completes
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    logger.info('Webhook request completed', {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      notificationId: req.body?.notificationId,
      success: res.statusCode >= 200 && res.statusCode < 300
    });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware to handle webhook errors
 */
export const handleWebhookError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Webhook processing error', {
    error: error.message,
    stack: error.stack,
    notificationId: req.body?.notificationId,
    notificationType: req.body?.notificationType
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error processing webhook',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
};
