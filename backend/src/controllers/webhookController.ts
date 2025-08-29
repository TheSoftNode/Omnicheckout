import { Request, Response } from 'express';
import { WebhookService } from '../services/webhookService';
import {
  CreateWebhookSubscriptionRequest,
  UpdateWebhookSubscriptionRequest,
  WebhookRequest,
  WebhookNotification
} from '../interfaces/webhook.interface';
import { logger } from '../utils/logger';

export class WebhookController {
  private webhookService: WebhookService;

  constructor() {
    this.webhookService = new WebhookService();
  }

  /**
   * Create a new webhook subscription
   */
  createSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const subscriptionData: CreateWebhookSubscriptionRequest = req.body;

      // Validate required fields
      if (!subscriptionData.endpoint || !subscriptionData.name) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: endpoint and name are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate endpoint URL format
      try {
        new URL(subscriptionData.endpoint);
        if (!subscriptionData.endpoint.startsWith('https://')) {
          res.status(400).json({
            success: false,
            message: 'Webhook endpoint must use HTTPS',
            timestamp: new Date().toISOString()
          });
          return;
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid webhook endpoint URL format',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Test endpoint connectivity before creating subscription
      const isEndpointValid = await this.webhookService.testWebhookEndpoint(subscriptionData.endpoint);
      if (!isEndpointValid) {
        res.status(400).json({
          success: false,
          message: 'Webhook endpoint is not accessible or returned an error',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const subscription = await this.webhookService.createSubscription(subscriptionData);

      logger.info('Webhook subscription created via API', {
        subscriptionId: subscription.id,
        endpoint: subscription.endpoint
      });

      res.status(201).json({
        success: true,
        message: 'Webhook subscription created successfully',
        data: subscription,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to create webhook subscription via API', {
        error: error.message,
        body: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create webhook subscription',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get all webhook subscriptions
   */
  getSubscriptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const subscriptions = await this.webhookService.getSubscriptions();

      res.status(200).json({
        success: true,
        message: 'Webhook subscriptions retrieved successfully',
        data: subscriptions,
        count: subscriptions.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to get webhook subscriptions via API', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webhook subscriptions',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Update a webhook subscription
   */
  updateSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const { subscriptionId } = req.params;
      const updateData: UpdateWebhookSubscriptionRequest = req.body;

      if (!subscriptionId) {
        res.status(400).json({
          success: false,
          message: 'Subscription ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const subscription = await this.webhookService.updateSubscription(subscriptionId, updateData);

      logger.info('Webhook subscription updated via API', {
        subscriptionId: subscription.id
      });

      res.status(200).json({
        success: true,
        message: 'Webhook subscription updated successfully',
        data: subscription,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to update webhook subscription via API', {
        subscriptionId: req.params.subscriptionId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update webhook subscription',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Delete a webhook subscription
   */
  deleteSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        res.status(400).json({
          success: false,
          message: 'Subscription ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      await this.webhookService.deleteSubscription(subscriptionId);

      logger.info('Webhook subscription deleted via API', {
        subscriptionId
      });

      res.status(200).json({
        success: true,
        message: 'Webhook subscription deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to delete webhook subscription via API', {
        subscriptionId: req.params.subscriptionId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete webhook subscription',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Handle incoming webhook notifications from Circle
   */
  handleWebhookNotification = async (req: WebhookRequest, res: Response): Promise<void> => {
    try {
      // Extract signature and key ID from headers
      const signature = req.headers['x-circle-signature'] as string;
      const keyId = req.headers['x-circle-key-id'] as string;

      if (!signature || !keyId) {
        logger.warn('Webhook received without required headers', {
          hasSignature: !!signature,
          hasKeyId: !!keyId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.status(400).json({
          success: false,
          message: 'Missing required webhook headers: X-Circle-Signature and X-Circle-Key-Id',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get raw body as string for signature verification
      const rawBody = JSON.stringify(req.body);

      // Verify the webhook signature
      const isSignatureValid = await this.webhookService.verifySignature(
        signature,
        keyId,
        rawBody
      );

      if (!isSignatureValid) {
        logger.error('Invalid webhook signature received', {
          keyId,
          notificationId: req.body.notificationId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.status(401).json({
          success: false,
          message: 'Invalid webhook signature',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Process the webhook notification
      const notification: WebhookNotification = req.body;
      const result = await this.webhookService.processWebhookNotification(notification);

      if (result.success) {
        logger.info('Webhook notification processed successfully', {
          notificationId: notification.notificationId,
          notificationType: notification.notificationType
        });

        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.error('Failed to process webhook notification', {
          notificationId: notification.notificationId,
          error: result.message,
          errors: result.errors
        });

        res.status(500).json({
          success: false,
          message: result.message,
          errors: result.errors,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      logger.error('Unexpected error handling webhook notification', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        message: 'Failed to process webhook notification',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get webhook events from database
   */
  getWebhookEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        eventType,
        resourceId,
        delivered,
        limit = 10,
        offset = 0
      } = req.query;

      const filters = {
        eventType: eventType as string,
        resourceId: resourceId as string,
        delivered: delivered === 'true' ? true : delivered === 'false' ? false : undefined,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10)
      };

      const result = await this.webhookService.getWebhookEvents(filters);

      res.status(200).json({
        success: true,
        message: 'Webhook events retrieved successfully',
        data: result.events,
        total: result.total,
        hasMore: result.hasMore,
        limit: filters.limit,
        offset: filters.offset,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to get webhook events via API', {
        error: error.message,
        query: req.query
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webhook events',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get specific webhook event by ID
   */
  getWebhookEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        res.status(400).json({
          success: false,
          message: 'Event ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const event = await this.webhookService.getWebhookEvent(eventId);

      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Webhook event not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Webhook event retrieved successfully',
        data: event,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to get webhook event via API', {
        eventId: req.params.eventId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webhook event',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Retry failed webhook deliveries
   */
  retryFailedWebhooks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { maxRetries = 3 } = req.body;

      const result = await this.webhookService.retryFailedWebhooks(maxRetries);

      logger.info('Webhook retry operation initiated via API', {
        maxRetries,
        result
      });

      res.status(200).json({
        success: true,
        message: 'Webhook retry operation completed',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to retry failed webhooks via API', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retry failed webhooks',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get webhook delivery statistics
   */
  getWebhookStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeframe = '24h' } = req.query;

      const stats = await this.webhookService.getWebhookStats(timeframe as string);

      res.status(200).json({
        success: true,
        message: 'Webhook statistics retrieved successfully',
        data: stats,
        timeframe,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to get webhook stats via API', {
        error: error.message,
        timeframe: req.query.timeframe
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webhook statistics',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Test webhook endpoint connectivity
   */
  testEndpoint = async (req: Request, res: Response): Promise<void> => {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        res.status(400).json({
          success: false,
          message: 'Endpoint URL is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate endpoint URL format
      try {
        new URL(endpoint);
        if (!endpoint.startsWith('https://')) {
          res.status(400).json({
            success: false,
            message: 'Webhook endpoint must use HTTPS',
            timestamp: new Date().toISOString()
          });
          return;
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid endpoint URL format',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const isValid = await this.webhookService.testWebhookEndpoint(endpoint);

      res.status(200).json({
        success: true,
        message: isValid ? 'Endpoint is accessible' : 'Endpoint is not accessible',
        data: { endpoint, isAccessible: isValid },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to test webhook endpoint via API', {
        error: error.message,
        endpoint: req.body.endpoint
      });

      res.status(500).json({
        success: false,
        message: 'Failed to test webhook endpoint',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Health check endpoint for webhook service
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const timestamp = new Date().toISOString();
      
      // Test database connectivity
      const testEvent = await this.webhookService.getWebhookEvents({ limit: 1 });
      
      res.status(200).json({
        success: true,
        message: 'Webhook service is healthy',
        data: {
          status: 'healthy',
          timestamp,
          service: 'webhook',
          database: 'connected',
          eventsCount: testEvent.total
        },
        timestamp
      });
    } catch (error: any) {
      logger.error('Webhook service health check failed', {
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        message: 'Webhook service health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Handle HEAD requests for webhook endpoint verification
   */
  handleHeadRequest = async (req: Request, res: Response): Promise<void> => {
    // Circle sends HEAD requests to verify webhook endpoints
    logger.debug('HEAD request received for webhook verification', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).send();
  };
}
