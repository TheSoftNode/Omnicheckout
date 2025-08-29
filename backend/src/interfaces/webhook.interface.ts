import { Request } from 'express';

// Webhook subscription interfaces
export interface WebhookSubscription {
  id: string;
  name: string;
  endpoint: string;
  enabled: boolean;
  createDate: string;
  updateDate: string;
  notificationTypes: string[];
  restricted: boolean;
}

export interface CreateWebhookSubscriptionRequest {
  endpoint: string;
  name: string;
  enabled: boolean;
  notificationTypes: string[];
}

export interface UpdateWebhookSubscriptionRequest {
  name?: string;
  enabled?: boolean;
  notificationTypes?: string[];
}

// Webhook notification interfaces
export interface WebhookNotification {
  subscriptionId: string;
  notificationId: string;
  notificationType: string;
  notification: any;
  timestamp: string;
  version: number;
}

export interface WebhookHeaders {
  'x-circle-signature': string;
  'x-circle-key-id': string;
}

export interface WebhookRequest extends Request {
  body: WebhookNotification;
  headers: WebhookHeaders & Request['headers'];
}

// Public key interface for signature verification
export interface WebhookPublicKey {
  id: string;
  algorithm: string;
  publicKey: string;
  createDate: string;
}

// Circle API responses
export interface CircleApiResponse<T> {
  data: T;
}

export interface CircleApiErrorResponse {
  code: number;
  message: string;
}

// Event types for webhooks
export type WebhookEventType = 
  | 'payments.created'
  | 'payments.updated'
  | 'payments.completed'
  | 'payments.failed'
  | 'transactions.created'
  | 'transactions.updated' 
  | 'transactions.confirmed'
  | 'transactions.failed'
  | 'rfi.created'
  | 'rfi.updated'
  | 'rfi.completed'
  | 'rfi.expired'
  | 'quotes.created'
  | 'quotes.expired'
  | '*'; // All events

// Payment status webhook payloads
export interface PaymentWebhookPayload {
  id: string;
  quoteId: string;
  blockchain: string;
  paymentMethodType: string;
  sourceAmount: {
    amount: string;
    currency: string;
  };
  destinationAmount: {
    amount: string;
    currency: string;
  };
  status: string;
  refCode?: string;
  customerRefId?: string;
  useCase?: string;
  expireDate: string;
  createDate: string;
  fees: {
    totalAmount: {
      amount: string;
      currency: string;
    };
    breakdown: Array<{
      type: string;
      amount: {
        amount: string;
        currency: string;
      };
    }>;
  };
  fiatSettlementTime: {
    min: string;
    max: string;
    unit: string;
  };
  rfis: any[];
  onChainTransactions: any[];
}

// Transaction status webhook payloads
export interface TransactionWebhookPayload {
  id: string;
  status: string;
  paymentId: string;
  expireDate: string;
  senderAddress: string;
  senderAccountType: string;
  blockchain: string;
  amount: {
    amount: string;
    currency: string;
  };
  destinationAddress: string;
  estimatedFee: {
    type: string;
    payload: {
      gasLimit: string;
      maxFeePerGas: string;
      maxPriorityFeePerGas: string;
    };
  };
  messageType: string;
  transactionHash?: string;
}

// RFI webhook payloads
export interface RFIWebhookPayload {
  id: string;
  paymentId: string;
  status: string;
  level: number;
  requestedFields: string[];
  createDate: string;
  expireDate: string;
  description?: string;
}

// Quote webhook payloads
export interface QuoteWebhookPayload {
  id: string;
  paymentMethodType: string;
  blockchain: string;
  senderCountry: string;
  destinationCountry: string;
  createDate: string;
  quoteExpireDate: string;
  cryptoFundsSettlementExpireDate: string;
  sourceAmount: {
    amount: string;
    currency: string;
  };
  destinationAmount: {
    amount: string;
    currency: string;
  };
  exchangeRate: {
    rate: string;
    pair: string;
  };
  fees: {
    totalAmount: {
      amount: string;
      currency: string;
    };
    breakdown: Array<{
      type: string;
      amount: {
        amount: string;
        currency: string;
      };
    }>;
  };
}

// Webhook validation errors
export interface WebhookValidationError {
  field: string;
  message: string;
  code: string;
}

// Webhook processing result
export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  errors?: WebhookValidationError[];
  data?: any;
}
