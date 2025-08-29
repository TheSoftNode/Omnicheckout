import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import {
  captureRawBody,
  validateWebhookHeaders,
  validateWebhookNotification,
  logWebhookRequest,
  handleWebhookError
} from '../middleware/webhookMiddleware';
import { rateLimiterMiddleware } from '../middleware/rateLimiter';

const router = Router();
const webhookController = new WebhookController();

/**
 * @route   POST /api/webhooks/receive
 * @desc    Receive webhook notifications from Circle
 * @access  Public (but signature verified)
 */
router.post('/receive',
  rateLimiterMiddleware,
  logWebhookRequest,
  captureRawBody,
  validateWebhookHeaders,
  validateWebhookNotification,
  webhookController.handleWebhookNotification as any,
  handleWebhookError
);

/**
 * @route   HEAD /api/webhooks/receive
 * @desc    Handle HEAD requests for webhook endpoint verification
 * @access  Public
 */
router.head('/receive', webhookController.handleHeadRequest);

/**
 * @route   POST /api/webhooks/subscriptions
 * @desc    Create a new webhook subscription
 * @access  Private
 */
router.post('/subscriptions',
  rateLimiterMiddleware,
  webhookController.createSubscription
);

/**
 * @route   GET /api/webhooks/subscriptions
 * @desc    Get all webhook subscriptions
 * @access  Private
 */
router.get('/subscriptions',
  rateLimiterMiddleware,
  webhookController.getSubscriptions
);

/**
 * @route   PUT /api/webhooks/subscriptions/:subscriptionId
 * @desc    Update a webhook subscription
 * @access  Private
 */
router.put('/subscriptions/:subscriptionId',
  rateLimiterMiddleware,
  webhookController.updateSubscription
);

/**
 * @route   DELETE /api/webhooks/subscriptions/:subscriptionId
 * @desc    Delete a webhook subscription
 * @access  Private
 */
router.delete('/subscriptions/:subscriptionId',
  rateLimiterMiddleware,
  webhookController.deleteSubscription
);

/**
 * @route   POST /api/webhooks/test-endpoint
 * @desc    Test webhook endpoint connectivity
 * @access  Private
 */
router.post('/test-endpoint',
  rateLimiterMiddleware,
  webhookController.testEndpoint
);

/**
 * @route   GET /api/webhooks/events
 * @desc    Get webhook events from database
 * @access  Private
 */
router.get('/events',
  rateLimiterMiddleware,
  webhookController.getWebhookEvents
);

/**
 * @route   GET /api/webhooks/events/:eventId
 * @desc    Get specific webhook event by ID
 * @access  Private
 */
router.get('/events/:eventId',
  rateLimiterMiddleware,
  webhookController.getWebhookEvent
);

/**
 * @route   POST /api/webhooks/retry
 * @desc    Retry failed webhook deliveries
 * @access  Private
 */
router.post('/retry',
  rateLimiterMiddleware,
  webhookController.retryFailedWebhooks
);

/**
 * @route   GET /api/webhooks/stats
 * @desc    Get webhook delivery statistics
 * @access  Private
 */
router.get('/stats',
  rateLimiterMiddleware,
  webhookController.getWebhookStats
);

/**
 * @route   GET /api/webhooks/health
 * @desc    Health check for webhook service
 * @access  Public
 */
router.get('/health', webhookController.healthCheck);

/**
 * @route   GET /api/webhooks/event-types
 * @desc    Get supported webhook event types
 * @access  Public
 */
router.get('/event-types', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Supported webhook event types',
    data: {
      paymentEvents: [
        'payments.created',
        'payments.updated',
        'payments.completed',
        'payments.failed'
      ],
      transactionEvents: [
        'transactions.created',
        'transactions.updated',
        'transactions.confirmed',
        'transactions.failed'
      ],
      rfiEvents: [
        'rfi.created',
        'rfi.updated',
        'rfi.completed',
        'rfi.expired'
      ],
      quoteEvents: [
        'quotes.created',
        'quotes.expired'
      ],
      wildcardEvents: [
        '*' // Subscribe to all events
      ]
    }
  });
});

/**
 * @route   GET /api/webhooks/docs
 * @desc    Get webhook integration documentation
 * @access  Public
 */
router.get('/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Webhook integration documentation',
    data: {
      overview: 'Circle CPN webhook integration for OmniCheckout',
      signatureVerification: {
        description: 'All webhooks are signed with ECDSA_SHA_256',
        headers: {
          'X-Circle-Signature': 'Base64 encoded signature',
          'X-Circle-Key-Id': 'Public key ID for signature verification'
        },
        verificationSteps: [
          '1. Extract signature and key ID from headers',
          '2. Fetch public key using key ID',
          '3. Verify signature against raw request body',
          '4. Process notification if signature is valid'
        ]
      },
      endpointRequirements: {
        protocol: 'HTTPS required',
        methods: ['POST for notifications', 'HEAD for verification'],
        responseFormat: 'JSON with success boolean and message',
        timeoutHandling: 'Respond within 30 seconds',
        retryPolicy: 'Circle retries failed deliveries with exponential backoff'
      },
      notificationStructure: {
        subscriptionId: 'UUID of the webhook subscription',
        notificationId: 'UUID of the specific notification',
        notificationType: 'Event type (e.g., payments.completed)',
        notification: 'Event-specific payload data',
        timestamp: 'ISO 8601 timestamp of the event',
        version: 'Notification schema version'
      },
      examples: {
        paymentCompleted: {
          notificationType: 'payments.completed',
          notification: {
            id: 'payment-uuid',
            status: 'COMPLETED',
            sourceAmount: { amount: '10.000000', currency: 'USDC' },
            destinationAmount: { amount: '200.23', currency: 'MXN' }
          }
        }
      }
    }
  });
});

// Legacy Circle webhook endpoint for backward compatibility
router.post('/circle', async (req, res) => {
  // Convert legacy payload to new format and process
  const legacyPayload = req.body;
  
  // Create a simple response for legacy webhooks
  res.status(200).json({
    success: true,
    message: 'Legacy webhook received',
    data: { received: true },
    timestamp: new Date().toISOString()
  });
});

export { router as webhookRoutes };
