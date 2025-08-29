import * as crypto from 'crypto';
import axios from 'axios';
import {
  WebhookSubscription,
  CreateWebhookSubscriptionRequest,
  UpdateWebhookSubscriptionRequest,
  WebhookNotification,
  WebhookPublicKey,
  CircleApiResponse,
  WebhookProcessingResult,
  PaymentWebhookPayload,
  TransactionWebhookPayload,
  RFIWebhookPayload,
  QuoteWebhookPayload
} from '../interfaces/webhook.interface';
import { logger } from '../utils/logger';
import { WebhookEvent, IWebhookEvent, Payment, IPayment, Transaction } from '../models';

// Simple in-memory cache for public keys (still useful for Circle API keys)
interface CacheItem<T> {
  data: T;
  expiry: number;
}

class SimpleCache<T> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private ttl: number;

  constructor(ttlSeconds: number = 86400) {
    this.ttl = ttlSeconds * 1000; // Convert to milliseconds
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.data;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      data: value,
      expiry: Date.now() + this.ttl
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export class WebhookService {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly publicKeyCache: SimpleCache<WebhookPublicKey>;

  constructor() {
    this.baseURL = process.env.CIRCLE_API_BASE_URL || 'https://api-staging.circle.com';
    this.apiKey = process.env.CIRCLE_API_KEY || '';
    // Cache public keys for 24 hours to avoid repeated API calls
    this.publicKeyCache = new SimpleCache<WebhookPublicKey>(86400);
  }

  /**
   * Create a new webhook subscription
   */
  async createSubscription(subscriptionData: CreateWebhookSubscriptionRequest): Promise<WebhookSubscription> {
    try {
      logger.info('Creating webhook subscription', { endpoint: subscriptionData.endpoint });

      const response = await axios.post<CircleApiResponse<WebhookSubscription>>(
        `${this.baseURL}/v2/cpn/notifications/subscriptions`,
        subscriptionData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      logger.info('Webhook subscription created successfully', { 
        subscriptionId: response.data.data.id 
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Failed to create webhook subscription', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Failed to create webhook subscription: ${error.message}`);
    }
  }

  /**
   * Get all webhook subscriptions
   */
  async getSubscriptions(): Promise<WebhookSubscription[]> {
    try {
      logger.info('Fetching webhook subscriptions');

      const response = await axios.get<CircleApiResponse<WebhookSubscription[]>>(
        `${this.baseURL}/v2/cpn/notifications/subscriptions`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          }
        }
      );

      logger.info('Webhook subscriptions fetched successfully', { 
        count: response.data.data.length 
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Failed to fetch webhook subscriptions', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Failed to fetch webhook subscriptions: ${error.message}`);
    }
  }

  /**
   * Update a webhook subscription
   */
  async updateSubscription(
    subscriptionId: string, 
    updateData: UpdateWebhookSubscriptionRequest
  ): Promise<WebhookSubscription> {
    try {
      logger.info('Updating webhook subscription', { subscriptionId });

      const response = await axios.put<CircleApiResponse<WebhookSubscription>>(
        `${this.baseURL}/v2/cpn/notifications/subscriptions/${subscriptionId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      logger.info('Webhook subscription updated successfully', { subscriptionId });

      return response.data.data;
    } catch (error: any) {
      logger.error('Failed to update webhook subscription', {
        subscriptionId,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Failed to update webhook subscription: ${error.message}`);
    }
  }

  /**
   * Delete a webhook subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    try {
      logger.info('Deleting webhook subscription', { subscriptionId });

      await axios.delete(
        `${this.baseURL}/v2/cpn/notifications/subscriptions/${subscriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          }
        }
      );

      logger.info('Webhook subscription deleted successfully', { subscriptionId });
    } catch (error: any) {
      logger.error('Failed to delete webhook subscription', {
        subscriptionId,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Failed to delete webhook subscription: ${error.message}`);
    }
  }

  /**
   * Get public key for signature verification
   */
  async getPublicKey(keyId: string): Promise<WebhookPublicKey> {
    try {
      // Check cache first
      const cachedKey = this.publicKeyCache.get(keyId);
      if (cachedKey) {
        logger.debug('Using cached public key', { keyId });
        return cachedKey;
      }

      logger.info('Fetching public key for signature verification', { keyId });

      const response = await axios.get<CircleApiResponse<WebhookPublicKey>>(
        `${this.baseURL}/v2/cpn/notifications/publicKey/${keyId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          }
        }
      );

      const publicKey = response.data.data;
      
      // Cache the public key
      this.publicKeyCache.set(keyId, publicKey);

      logger.info('Public key fetched and cached successfully', { keyId });

      return publicKey;
    } catch (error: any) {
      logger.error('Failed to fetch public key', {
        keyId,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Failed to fetch public key: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature using Circle's public key
   */
  async verifySignature(
    signature: string,
    keyId: string,
    payload: string
  ): Promise<boolean> {
    try {
      logger.debug('Verifying webhook signature', { keyId });

      // Get the public key
      const publicKeyData = await this.getPublicKey(keyId);

      // Decode the base64 public key
      const publicKeyBuffer = Buffer.from(publicKeyData.publicKey, 'base64');
      
      // Create a public key object
      const publicKey = crypto.createPublicKey({
        key: publicKeyBuffer,
        format: 'der',
        type: 'spki'
      });

      // Decode the base64 signature
      const signatureBuffer = Buffer.from(signature, 'base64');

      // Verify the signature
      const isValid = crypto.verify(
        'sha256',
        Buffer.from(payload, 'utf8'),
        publicKey,
        signatureBuffer
      );

      logger.info('Webhook signature verification result', { 
        keyId, 
        isValid,
        algorithm: publicKeyData.algorithm
      });

      return isValid;
    } catch (error: any) {
      logger.error('Failed to verify webhook signature', {
        keyId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Store webhook event in database
   */
  async storeWebhookEvent(notification: WebhookNotification): Promise<IWebhookEvent> {
    try {
      const webhookEvent = new WebhookEvent({
        eventId: notification.notificationId,
        eventType: notification.notificationType,
        resourceId: this.extractResourceId(notification),
        data: notification.notification,
        deliveryAttempts: 0,
        delivered: false
      });

      await webhookEvent.save();
      
      logger.info('Webhook event stored in database', { 
        eventId: notification.notificationId,
        eventType: notification.notificationType 
      });

      return webhookEvent;
    } catch (error: any) {
      logger.error('Failed to store webhook event', {
        notificationId: notification.notificationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update webhook event delivery status
   */
  async updateWebhookEventDelivery(eventId: string, delivered: boolean, attempts: number): Promise<void> {
    try {
      await WebhookEvent.updateOne(
        { eventId },
        { 
          delivered, 
          deliveryAttempts: attempts,
          lastAttemptAt: new Date()
        }
      );

      logger.debug('Updated webhook event delivery status', { eventId, delivered, attempts });
    } catch (error: any) {
      logger.error('Failed to update webhook event delivery status', {
        eventId,
        error: error.message
      });
    }
  }

  /**
   * Extract resource ID from notification payload
   */
  private extractResourceId(notification: WebhookNotification): string {
    const payload = notification.notification as any;
    return payload.id || payload.paymentId || payload.transactionId || notification.notificationId;
  }

  /**
   * Process webhook notification based on type
   */
  async processWebhookNotification(notification: WebhookNotification): Promise<WebhookProcessingResult> {
    try {
      logger.info('Processing webhook notification', {
        notificationId: notification.notificationId,
        notificationType: notification.notificationType,
        subscriptionId: notification.subscriptionId
      });

      // Store the webhook event in database first
      const webhookEvent = await this.storeWebhookEvent(notification);

      let result: WebhookProcessingResult;

      try {
        switch (notification.notificationType) {
          case 'payments.created':
          case 'payments.updated':
          case 'payments.completed':
          case 'payments.failed':
            result = await this.processPaymentWebhook(notification);
            break;

          case 'transactions.created':
          case 'transactions.updated':
          case 'transactions.confirmed':
          case 'transactions.failed':
            result = await this.processTransactionWebhook(notification);
            break;

          case 'rfi.created':
          case 'rfi.updated':
          case 'rfi.completed':
          case 'rfi.expired':
            result = await this.processRFIWebhook(notification);
            break;

          case 'quotes.created':
          case 'quotes.expired':
            result = await this.processQuoteWebhook(notification);
            break;

          default:
            logger.warn('Unknown webhook notification type', {
              notificationType: notification.notificationType
            });
            result = {
              success: true,
              message: 'Unknown notification type - ignored'
            };
        }

        // Update delivery status as successful
        await this.updateWebhookEventDelivery(notification.notificationId, true, 1);

        logger.info('Webhook notification processed successfully', {
          notificationId: notification.notificationId,
          success: result.success
        });

        return result;

      } catch (processingError: any) {
        // Update delivery status as failed
        await this.updateWebhookEventDelivery(notification.notificationId, false, 1);
        throw processingError;
      }

    } catch (error: any) {
      logger.error('Failed to process webhook notification', {
        notificationId: notification.notificationId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to process notification: ${error.message}`
      };
    }
  }

  /**
   * Process payment-related webhook notifications
   */
  private async processPaymentWebhook(notification: WebhookNotification): Promise<WebhookProcessingResult> {
    const payload = notification.notification as PaymentWebhookPayload;
    
    logger.info('Processing payment webhook', {
      paymentId: payload.id,
      status: payload.status,
      notificationType: notification.notificationType
    });

    try {
      // Find the payment in our database
      const payment = await Payment.findOne({ paymentId: payload.id });

      if (payment) {
        // Update payment status based on webhook type
        switch (notification.notificationType) {
          case 'payments.created':
            payment.status = 'created';
            logger.info('Payment created webhook received', { paymentId: payload.id });
            break;

          case 'payments.updated':
            // Map Circle payment status to our internal status
            payment.status = this.mapCirclePaymentStatus(payload.status);
            logger.info('Payment updated webhook received', { 
              paymentId: payload.id, 
              status: payload.status,
              mappedStatus: payment.status
            });
            break;

          case 'payments.completed':
            payment.status = 'completed';
            logger.info('Payment completed webhook received', { paymentId: payload.id });
            break;

          case 'payments.failed':
            payment.status = 'failed';
            logger.error('Payment failed webhook received', { 
              paymentId: payload.id,
              status: payload.status 
            });
            break;
        }

        // Update metadata with webhook information
        payment.metadata = {
          ...payment.metadata,
          lastWebhookUpdate: new Date(),
          lastWebhookType: notification.notificationType,
          circleStatus: payload.status
        };

        await payment.save();

        logger.info('Updated payment record from webhook', {
          paymentId: payload.id,
          newStatus: payment.status
        });
      } else {
        logger.warn('Payment not found in database for webhook', { 
          paymentId: payload.id 
        });
      }

      return {
        success: true,
        message: 'Payment webhook processed successfully',
        data: { paymentId: payload.id, status: payload.status }
      };

    } catch (error: any) {
      logger.error('Failed to process payment webhook', {
        paymentId: payload.id,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to process payment webhook: ${error.message}`,
        data: { paymentId: payload.id }
      };
    }
  }

  /**
   * Map Circle payment status to our internal payment status
   */
  private mapCirclePaymentStatus(circleStatus: string): IPayment['status'] {
    const statusMap: Record<string, IPayment['status']> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'paid': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled'
    };

    return statusMap[circleStatus] || 'pending';
  }

  /**
   * Process transaction-related webhook notifications
   */
  private async processTransactionWebhook(notification: WebhookNotification): Promise<WebhookProcessingResult> {
    const payload = notification.notification as TransactionWebhookPayload;
    
    logger.info('Processing transaction webhook', {
      transactionId: payload.id,
      paymentId: payload.paymentId,
      status: payload.status,
      notificationType: notification.notificationType
    });

    try {
      // Find the transaction in our database
      const transaction = await Transaction.findOne({ transactionId: payload.id });

      if (transaction) {
        // Update transaction status based on webhook type
        switch (notification.notificationType) {
          case 'transactions.created':
            transaction.status = 'pending';
            logger.info('Transaction created webhook received', { 
              transactionId: payload.id,
              paymentId: payload.paymentId 
            });
            break;

          case 'transactions.updated':
            transaction.status = this.mapCircleTransactionStatus(payload.status);
            logger.info('Transaction updated webhook received', { 
              transactionId: payload.id,
              status: payload.status,
              mappedStatus: transaction.status
            });
            break;

          case 'transactions.confirmed':
            transaction.status = 'confirmed';
            if (payload.transactionHash) {
              transaction.transactionHash = payload.transactionHash;
            }
            logger.info('Transaction confirmed webhook received', { 
              transactionId: payload.id,
              transactionHash: payload.transactionHash 
            });
            break;

          case 'transactions.failed':
            transaction.status = 'failed';
            logger.error('Transaction failed webhook received', { 
              transactionId: payload.id,
              status: payload.status 
            });
            break;
        }

        // Update metadata with webhook information
        transaction.metadata = {
          ...transaction.metadata,
          lastWebhookUpdate: new Date(),
          lastWebhookType: notification.notificationType,
          circleStatus: payload.status
        };

        await transaction.save();

        logger.info('Updated transaction record from webhook', {
          transactionId: payload.id,
          newStatus: transaction.status
        });
      } else {
        logger.warn('Transaction not found in database for webhook', { 
          transactionId: payload.id 
        });
      }

      return {
        success: true,
        message: 'Transaction webhook processed successfully',
        data: { 
          transactionId: payload.id, 
          paymentId: payload.paymentId,
          status: payload.status 
        }
      };

    } catch (error: any) {
      logger.error('Failed to process transaction webhook', {
        transactionId: payload.id,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to process transaction webhook: ${error.message}`,
        data: { transactionId: payload.id }
      };
    }
  }

  /**
   * Map Circle transaction status to our internal transaction status
   */
  private mapCircleTransactionStatus(circleStatus: string): 'pending' | 'confirmed' | 'completed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'confirmed' | 'completed' | 'failed'> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'complete': 'completed',
      'failed': 'failed'
    };

    return statusMap[circleStatus] || 'pending';
  }

  /**
   * Process RFI-related webhook notifications
   */
  private async processRFIWebhook(notification: WebhookNotification): Promise<WebhookProcessingResult> {
    const payload = notification.notification as RFIWebhookPayload;
    
    logger.info('Processing RFI webhook', {
      rfiId: payload.id,
      paymentId: payload.paymentId,
      status: payload.status,
      level: payload.level,
      notificationType: notification.notificationType
    });

    // Handle RFI status updates
    switch (notification.notificationType) {
      case 'rfi.created':
        logger.info('RFI created webhook received', { 
          rfiId: payload.id,
          paymentId: payload.paymentId,
          level: payload.level,
          requestedFields: payload.requestedFields
        });
        break;

      case 'rfi.updated':
        logger.info('RFI updated webhook received', { 
          rfiId: payload.id,
          status: payload.status 
        });
        break;

      case 'rfi.completed':
        logger.info('RFI completed webhook received', { 
          rfiId: payload.id 
        });
        break;

      case 'rfi.expired':
        logger.warn('RFI expired webhook received', { 
          rfiId: payload.id,
          expireDate: payload.expireDate 
        });
        break;
    }

    return {
      success: true,
      message: 'RFI webhook processed successfully',
      data: { 
        rfiId: payload.id, 
        paymentId: payload.paymentId,
        status: payload.status 
      }
    };
  }

  /**
   * Process quote-related webhook notifications
   */
  private async processQuoteWebhook(notification: WebhookNotification): Promise<WebhookProcessingResult> {
    const payload = notification.notification as QuoteWebhookPayload;
    
    logger.info('Processing quote webhook', {
      quoteId: payload.id,
      notificationType: notification.notificationType
    });

    switch (notification.notificationType) {
      case 'quotes.created':
        logger.info('Quote created webhook received', { quoteId: payload.id });
        break;

      case 'quotes.expired':
        logger.warn('Quote expired webhook received', { 
          quoteId: payload.id,
          expireDate: payload.quoteExpireDate 
        });
        break;
    }

    return {
      success: true,
      message: 'Quote webhook processed successfully',
      data: { quoteId: payload.id }
    };
  }

  /**
   * Get webhook events from database
   */
  async getWebhookEvents(filters: {
    eventType?: string;
    resourceId?: string;
    delivered?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    events: IWebhookEvent[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const query: any = {};
      
      if (filters.eventType) query.eventType = filters.eventType;
      if (filters.resourceId) query.resourceId = filters.resourceId;
      if (filters.delivered !== undefined) query.delivered = filters.delivered;

      const limit = filters.limit || 10;
      const offset = filters.offset || 0;

      const events = await WebhookEvent.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec();

      const total = await WebhookEvent.countDocuments(query);

      return {
        events,
        total,
        hasMore: offset + limit < total
      };
    } catch (error: any) {
      logger.error('Failed to get webhook events', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Get webhook event by ID
   */
  async getWebhookEvent(eventId: string): Promise<IWebhookEvent | null> {
    try {
      return await WebhookEvent.findOne({ eventId });
    } catch (error: any) {
      logger.error('Failed to get webhook event', {
        eventId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Retry failed webhook deliveries
   */
  async retryFailedWebhooks(maxRetries: number = 3): Promise<{
    attempted: number;
    successful: number;
    failed: number;
  }> {
    try {
      const failedEvents = await WebhookEvent.find({
        delivered: false,
        deliveryAttempts: { $lt: maxRetries }
      }).limit(100);

      let attempted = 0;
      let successful = 0;
      let failed = 0;

      for (const event of failedEvents) {
        attempted++;
        
        try {
          // Simulate webhook delivery retry (in production, you'd call the actual webhook endpoint)
          logger.info('Retrying webhook delivery', { 
            eventId: event.eventId,
            attempt: event.deliveryAttempts + 1
          });

          // Update delivery attempt
          event.deliveryAttempts += 1;
          event.lastAttemptAt = new Date();
          
          // For simulation, mark as delivered after 2 attempts
          if (event.deliveryAttempts >= 2) {
            event.delivered = true;
            successful++;
          }
          
          await event.save();

        } catch (retryError: any) {
          failed++;
          logger.error('Failed to retry webhook delivery', {
            eventId: event.eventId,
            error: retryError.message
          });
        }
      }

      logger.info('Webhook retry operation completed', { attempted, successful, failed });

      return { attempted, successful, failed };
    } catch (error: any) {
      logger.error('Failed to retry failed webhooks', { error: error.message });
      throw error;
    }
  }

  /**
   * Get webhook delivery statistics
   */
  async getWebhookStats(timeframe: string = '24h'): Promise<{
    total: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
    avgDeliveryAttempts: number;
  }> {
    try {
      const timeframeDate = new Date();
      if (timeframe === '24h') {
        timeframeDate.setHours(timeframeDate.getHours() - 24);
      } else if (timeframe === '7d') {
        timeframeDate.setDate(timeframeDate.getDate() - 7);
      } else if (timeframe === '30d') {
        timeframeDate.setDate(timeframeDate.getDate() - 30);
      }

      const stats = await WebhookEvent.aggregate([
        { $match: { createdAt: { $gte: timeframeDate } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            delivered: { $sum: { $cond: ['$delivered', 1, 0] } },
            avgDeliveryAttempts: { $avg: '$deliveryAttempts' }
          }
        }
      ]);

      const result = stats[0] || { total: 0, delivered: 0, avgDeliveryAttempts: 0 };
      const failed = result.total - result.delivered;
      const deliveryRate = result.total > 0 ? (result.delivered / result.total) * 100 : 0;

      return {
        total: result.total,
        delivered: result.delivered,
        failed,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        avgDeliveryAttempts: Math.round(result.avgDeliveryAttempts * 100) / 100
      };
    } catch (error: any) {
      logger.error('Failed to get webhook stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Test webhook endpoint connectivity
   */
  async testWebhookEndpoint(endpoint: string): Promise<boolean> {
    try {
      logger.info('Testing webhook endpoint connectivity', { endpoint });

      // Send a HEAD request to test the endpoint
      const response = await axios.head(endpoint, {
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 500
      });

      const isValid = response.status >= 200 && response.status < 300;
      
      logger.info('Webhook endpoint test result', { 
        endpoint, 
        isValid, 
        status: response.status 
      });

      return isValid;
    } catch (error: any) {
      logger.error('Webhook endpoint test failed', {
        endpoint,
        error: error.message
      });
      return false;
    }
  }
}
