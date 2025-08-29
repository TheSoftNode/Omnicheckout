// Copyright (c) 2025, Circle Technologies, LLC. All rights reserved.
//
// SPDX-License-Identifier: Apache-2.0

export interface Money {
  amount: string
  currency: 'USD' | 'EUR'
}

export interface Source {
  id: string
  type: 'card' | 'wire' | 'blockchain' | 'wallet'
  address?: string
  chain?: string
}

export interface Destination {
  id: string
  type: 'card' | 'wire' | 'blockchain' | 'wallet'
  address?: string
  chain?: string
}

export interface Verification {
  avs: 'not_requested' | 'pending' | 'pass' | 'fail' | 'unavailable'
  cvv: 'not_requested' | 'pending' | 'pass' | 'fail' | 'unavailable'
}

export interface RiskEvaluation {
  decision: 'approved' | 'denied' | 'review'
  reason: string
}

export interface BlockchainAddress {
  address: string
  currency: string
  chain: string
}

// Payment Session Interfaces
export interface PaymentSession {
  sessionId: string
  merchantId: string
  merchantWalletAddress: string
  preferredChain: number
  destinationChain: number
  sourceChain?: number
  customerAddress?: string
  amount: string
  currency: string
  status: PaymentStatus
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
  transactionHash?: string
  attestationHash?: string
  mintTransactionHash?: string
  errorCode?: string
  metadata?: Record<string, any>
  riskEvaluation?: RiskEvaluation
}

export enum PaymentStatus {
  CREATED = 'created',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  BRIDGING = 'bridging',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

// Circle API Payment Interfaces
export interface CirclePayment {
  id: string
  type: 'payment'
  merchantId: string
  merchantWalletId: string
  amount: Money
  source: Source
  description?: string
  status: 'pending' | 'confirmed' | 'paid' | 'failed'
  verification?: Verification
  fees?: Money
  trackingRef?: string
  errorCode?: string
  metadata?: Record<string, any>
  riskEvaluation?: RiskEvaluation
  createDate: string
  updateDate: string
}

export interface CircleTransfer {
  id: string
  source: Source
  destination: Destination
  amount: Money
  transactionHash?: string
  status: 'pending' | 'complete' | 'failed'
  riskEvaluation?: RiskEvaluation
  createDate: string
}

export interface CirclePayout {
  id: string
  sourceWalletId: string
  destination: Destination
  amount: Money
  toAmount?: Money
  fees?: Money
  status: 'pending' | 'complete' | 'failed'
  trackingRef?: string
  externalRef?: string
  errorCode?: string
  riskEvaluation?: RiskEvaluation
  createDate: string
  updateDate: string
}

// Request/Response Interfaces
export interface CreatePaymentSessionRequest {
  merchantId: string
  merchantWalletAddress: string
  preferredChain: number
  amount: string
  currency?: string
  description?: string
  metadata?: Record<string, any>
}

export interface UpdatePaymentSessionRequest {
  sourceChain?: number
  customerAddress?: string
  status?: PaymentStatus
  transactionHash?: string
  attestationHash?: string
  mintTransactionHash?: string
  metadata?: Record<string, any>
}

export interface CreateCirclePaymentRequest {
  idempotencyKey: string
  amount: Money
  verification?: {
    avs?: string
    cvv?: string
  }
  source: {
    id: string
    type: string
  }
  description?: string
  metadata?: Record<string, any>
}

export interface CreateCircleTransferRequest {
  idempotencyKey: string
  source: Source
  destination: Destination
  amount: Money
}

export interface CreateCirclePayoutRequest {
  idempotencyKey: string
  destination: Destination
  amount: Money
  sourceWalletId: string
  metadata?: Record<string, any>
}

export interface PaymentQuote {
  id: string
  sourceChain: number
  destinationChain: number
  amount: Money
  fees: Money
  exchangeRate?: string
  expiresAt: Date
  estimatedConfirmationTime: number // in seconds
}

export interface PaymentSessionListQuery {
  merchantId?: string
  status?: PaymentStatus
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}

export interface PaymentSessionListResponse {
  sessions: PaymentSession[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Webhook Interfaces
export interface WebhookPayload {
  id: string
  type: 'payment' | 'transfer' | 'payout'
  event: 'created' | 'updated' | 'completed' | 'failed'
  data: CirclePayment | CircleTransfer | CirclePayout
  timestamp: string
}

// Error Interfaces
export interface PaymentError {
  code: string
  message: string
  details?: Record<string, any>
}

export interface ValidationError extends PaymentError {
  field: string
  value: any
}

// USDC Transfer Interfaces
export interface USDCTransferRequest {
  sourceChain: number
  destinationChain: number
  amount: string
  recipientAddress: string
  senderAddress: string
  transferType?: 'normal' | 'fast'
}

export interface USDCTransferResponse {
  transactionHash: string
  messageHash?: string
  attestation?: string
  status: 'pending' | 'confirmed' | 'bridging' | 'completed' | 'failed'
  estimatedConfirmationTime: number
  fees: {
    gas: string
    bridge?: string
  }
}

// Analytics Interfaces
export interface PaymentAnalytics {
  totalVolume: Money
  totalCount: number
  successRate: number
  averageProcessingTime: number
  topChains: Array<{
    chainId: number
    volume: Money
    count: number
  }>
  recentTransactions: PaymentSession[]
}

export interface MerchantSettings {
  merchantId: string
  defaultChain: number
  supportedChains: number[]
  autoAcceptPayments: boolean
  webhookUrl?: string
  webhookSecret?: string
  riskSettings: {
    maxDailyVolume: Money
    maxSingleTransaction: Money
    requireApprovalThreshold: Money
  }
}
