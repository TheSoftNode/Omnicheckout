import mongoose, { Schema, Document } from 'mongoose';

// Transaction model
export interface ITransaction extends Document {
  transactionId: string;
  sourceChain: string;
  destinationChain: string;
  amount: string;
  sourceAddress: string;
  destinationAddress: string;
  status: 'pending' | 'confirmed' | 'completed' | 'failed';
  transactionHash?: string;
  attestationHash?: string;
  burnTxHash?: string;
  mintTxHash?: string;
  messageBytes?: string;
  messageHash?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

const TransactionSchema = new Schema<ITransaction>({
  transactionId: { type: String, required: true, unique: true, index: true },
  sourceChain: { type: String, required: true },
  destinationChain: { type: String, required: true },
  amount: { type: String, required: true },
  sourceAddress: { type: String, required: true },
  destinationAddress: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'completed', 'failed'], 
    default: 'pending',
    index: true
  },
  transactionHash: { type: String, sparse: true },
  attestationHash: { type: String, sparse: true },
  burnTxHash: { type: String, sparse: true },
  mintTxHash: { type: String, sparse: true },
  messageBytes: { type: String },
  messageHash: { type: String, sparse: true },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'transactions'
});

// Payment model
export interface IPayment extends Document {
  paymentId: string;
  merchantId: string;
  amount: string;
  currency: string;
  sourceChain: string;
  destinationChain: string;
  customerAddress: string;
  merchantAddress: string;
  status: 'created' | 'pending' | 'confirmed' | 'completed' | 'failed' | 'refunded' | 'expired' | 'cancelled' | 'bridging';
  transactionId?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  paymentId: { type: String, required: true, unique: true, index: true },
  merchantId: { type: String, required: true, index: true },
  amount: { type: String, required: true },
  currency: { type: String, required: true, default: 'USDC' },
  sourceChain: { type: String, required: true },
  destinationChain: { type: String, required: true },
  customerAddress: { type: String, required: true },
  merchantAddress: { type: String, required: true },
  status: {
    type: String,
    enum: ['created', 'pending', 'confirmed', 'completed', 'failed', 'refunded', 'expired', 'cancelled', 'bridging'],
    default: 'created',
    index: true
  },
  transactionId: { type: String, sparse: true },
  metadata: { type: Schema.Types.Mixed },
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
}, {
  timestamps: true,
  collection: 'payments'
});

// Merchant model
export interface IMerchant extends Document {
  merchantId: string;
  name: string;
  email: string;
  walletAddresses: {
    [chain: string]: string;
  };
  apiKey: string;
  webhookUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema<IMerchant>({
  merchantId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  walletAddresses: { type: Schema.Types.Mixed, required: true },
  apiKey: { type: String, required: true, unique: true },
  webhookUrl: { type: String },
  isActive: { type: Boolean, default: true, index: true }
}, {
  timestamps: true,
  collection: 'merchants'
});

// Webhook event model
export interface IWebhookEvent extends Document {
  eventId: string;
  eventType: string;
  resourceId: string;
  data: Record<string, any>;
  deliveryAttempts: number;
  delivered: boolean;
  lastAttemptAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>({
  eventId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true },
  data: { type: Schema.Types.Mixed, required: true },
  deliveryAttempts: { type: Number, default: 0 },
  delivered: { type: Boolean, default: false, index: true },
  lastAttemptAt: { type: Date }
}, {
  timestamps: true,
  collection: 'webhook_events'
});

// Export models
export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
export const Merchant = mongoose.model<IMerchant>('Merchant', MerchantSchema);
export const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
