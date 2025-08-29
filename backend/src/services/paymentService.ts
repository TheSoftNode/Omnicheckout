// Copyright (c) 2025, Circle Technologies, LLC. All rights reserved.
//
// SPDX-License-Identifier: Apache-2.0

import { 
  PaymentSession, 
  PaymentStatus, 
  CreatePaymentSessionRequest,
  UpdatePaymentSessionRequest,
  PaymentSessionListQuery,
  PaymentSessionListResponse,
  CirclePayment,
  CircleTransfer,
  CirclePayout,
  CreateCirclePaymentRequest,
  CreateCircleTransferRequest,
  CreateCirclePayoutRequest,
  PaymentQuote,
  USDCTransferRequest,
  USDCTransferResponse,
  PaymentAnalytics,
  MerchantSettings,
  Money
} from '../interfaces/payment.interface'
import { SupportedChainId } from '../types'
import { createLogger } from '../utils/logger'
import { Payment, IPayment, Merchant, IMerchant } from '../models'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'

const logger = createLogger('PaymentService')

// Circle API configuration
const CIRCLE_API_BASE = process.env.CIRCLE_API_BASE || 'https://api-sandbox.circle.com'
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY

// Helper function for error handling
const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'Unknown error'
}

class PaymentService {
  constructor() {
    this.validateConfiguration()
  }

  private validateConfiguration(): void {
    if (!CIRCLE_API_KEY) {
      logger.warn('Circle API key not configured - some features may not work')
    }
  }

  private getCircleHeaders() {
    return {
      'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  }

  // Payment Session Management
  async createPaymentSession(request: CreatePaymentSessionRequest): Promise<PaymentSession> {
    try {
      this.validateCreatePaymentRequest(request)
      
      const sessionId = uuidv4()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes

      // Create payment record in database
      const paymentData = {
        paymentId: sessionId,
        merchantId: request.merchantId,
        amount: request.amount,
        currency: request.currency || 'USD',
        sourceChain: request.preferredChain.toString(),
        destinationChain: request.preferredChain.toString(),
        customerAddress: '', // Will be set when customer initiates payment
        merchantAddress: request.merchantWalletAddress,
        status: 'created' as const,
        metadata: request.metadata,
        expiresAt
      }

      const payment = new Payment(paymentData)
      await payment.save()

      const session: PaymentSession = {
        sessionId,
        merchantId: request.merchantId,
        merchantWalletAddress: request.merchantWalletAddress,
        preferredChain: request.preferredChain,
        destinationChain: request.preferredChain,
        amount: request.amount,
        currency: request.currency || 'USD',
        status: PaymentStatus.CREATED,
        createdAt: now,
        updatedAt: now,
        expiresAt,
        metadata: request.metadata
      }

      logger.info('Payment session created', { 
        sessionId, 
        merchantId: request.merchantId, 
        amount: request.amount 
      })

      return session
    } catch (error) {
      logger.error('Failed to create payment session', { error: getErrorMessage(error), request })
      throw error
    }
  }

  async getPaymentSession(sessionId: string): Promise<PaymentSession | null> {
    try {
      const payment = await Payment.findOne({ paymentId: sessionId })
      
      if (!payment) {
        return null
      }

      // Check if session is expired
      const now = new Date()
      if (payment.expiresAt && now > payment.expiresAt && payment.status === 'created') {
        payment.status = 'expired'
        await payment.save()
      }

      // Convert payment document to PaymentSession
      const session: PaymentSession = {
        sessionId: payment.paymentId,
        merchantId: payment.merchantId,
        merchantWalletAddress: payment.merchantAddress,
        preferredChain: parseInt(payment.sourceChain, 10) as SupportedChainId,
        destinationChain: parseInt(payment.destinationChain, 10) as SupportedChainId,
        amount: payment.amount,
        currency: payment.currency,
        status: this.mapPaymentStatusToSessionStatus(payment.status),
        sourceChain: payment.customerAddress ? parseInt(payment.sourceChain, 10) as SupportedChainId : undefined,
        customerAddress: payment.customerAddress || undefined,
        transactionHash: payment.transactionId || undefined,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        expiresAt: payment.expiresAt || new Date(payment.createdAt.getTime() + 30 * 60 * 1000),
        metadata: payment.metadata
      }

      return session
    } catch (error) {
      logger.error('Failed to get payment session', { error: getErrorMessage(error), sessionId })
      throw error
    }
  }

  async updatePaymentSession(sessionId: string, updates: UpdatePaymentSessionRequest): Promise<PaymentSession | null> {
    try {
      const payment = await Payment.findOne({ paymentId: sessionId })
      
      if (!payment) {
        return null
      }

      // Validate status transitions
      if (updates.status && !this.isValidStatusTransition(payment.status, updates.status)) {
        throw new Error(`Invalid status transition from ${payment.status} to ${updates.status}`)
      }

      // Update allowed fields
      if (updates.sourceChain) {
        payment.sourceChain = updates.sourceChain.toString()
      }
      if (updates.customerAddress) {
        payment.customerAddress = updates.customerAddress
      }
      if (updates.status) {
        payment.status = this.mapSessionStatusToPaymentStatus(updates.status)
      }
      if (updates.transactionHash) {
        payment.transactionId = updates.transactionHash
      }
      if (updates.metadata) {
        payment.metadata = { ...payment.metadata, ...updates.metadata }
      }

      await payment.save()

      logger.info('Payment session updated', { sessionId, updates })

      // Return updated session
      return await this.getPaymentSession(sessionId)
    } catch (error) {
      logger.error('Failed to update payment session', { error: getErrorMessage(error), sessionId, updates })
      throw error
    }
  }

  async listPaymentSessions(query: PaymentSessionListQuery): Promise<PaymentSessionListResponse> {
    try {
      const mongoQuery: any = {}

      // Apply filters
      if (query.merchantId) {
        mongoQuery.merchantId = query.merchantId
      }

      if (query.status) {
        mongoQuery.status = this.mapSessionStatusToPaymentStatus(query.status)
      }

      if (query.startDate) {
        mongoQuery.createdAt = { ...mongoQuery.createdAt, $gte: new Date(query.startDate) }
      }

      if (query.endDate) {
        mongoQuery.createdAt = { ...mongoQuery.createdAt, $lte: new Date(query.endDate) }
      }

      // Pagination
      const limit = query.limit || 10
      const offset = query.offset || 0

      const payments = await Payment.find(mongoQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec()

      const total = await Payment.countDocuments(mongoQuery)

      // Convert to PaymentSession format
      const sessions: PaymentSession[] = payments.map(payment => ({
        sessionId: payment.paymentId,
        merchantId: payment.merchantId,
        merchantWalletAddress: payment.merchantAddress,
        preferredChain: parseInt(payment.sourceChain, 10) as SupportedChainId,
        destinationChain: parseInt(payment.destinationChain, 10) as SupportedChainId,
        amount: payment.amount,
        currency: payment.currency,
        status: this.mapPaymentStatusToSessionStatus(payment.status),
        sourceChain: payment.customerAddress ? parseInt(payment.sourceChain, 10) as SupportedChainId : undefined,
        customerAddress: payment.customerAddress || undefined,
        transactionHash: payment.transactionId || undefined,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        expiresAt: payment.expiresAt || new Date(payment.createdAt.getTime() + 30 * 60 * 1000),
        metadata: payment.metadata
      }))

      const hasMore = offset + limit < total

      return {
        sessions,
        total,
        limit,
        offset,
        hasMore
      }
    } catch (error) {
      logger.error('Failed to list payment sessions', { error: getErrorMessage(error), query })
      throw error
    }
  }

  // Circle API Integration methods remain the same
  async createCirclePayment(request: CreateCirclePaymentRequest): Promise<CirclePayment> {
    try {
      if (!CIRCLE_API_KEY) {
        throw new Error('Circle API key not configured')
      }

      const response = await axios.post(
        `${CIRCLE_API_BASE}/v1/payments`,
        request,
        { headers: this.getCircleHeaders() }
      )

      logger.info('Circle payment created', { paymentId: response.data.data.id })

      return response.data.data
    } catch (error) {
      logger.error('Failed to create Circle payment', { error: getErrorMessage(error), request })
      throw new Error('Payment creation failed')
    }
  }

  async getCirclePayment(paymentId: string): Promise<CirclePayment> {
    try {
      if (!CIRCLE_API_KEY) {
        throw new Error('Circle API key not configured')
      }

      const response = await axios.get(
        `${CIRCLE_API_BASE}/v1/payments/${paymentId}`,
        { headers: this.getCircleHeaders() }
      )

      return response.data.data
    } catch (error) {
      logger.error('Failed to get Circle payment', { error: getErrorMessage(error), paymentId })
      throw new Error('Payment retrieval failed')
    }
  }

  async createCircleTransfer(request: CreateCircleTransferRequest): Promise<CircleTransfer> {
    try {
      if (!CIRCLE_API_KEY) {
        throw new Error('Circle API key not configured')
      }

      const response = await axios.post(
        `${CIRCLE_API_BASE}/v1/transfers`,
        request,
        { headers: this.getCircleHeaders() }
      )

      logger.info('Circle transfer created', { transferId: response.data.data.id })

      return response.data.data
    } catch (error) {
      logger.error('Failed to create Circle transfer', { error: getErrorMessage(error), request })
      throw new Error('Transfer creation failed')
    }
  }

  async createCirclePayout(request: CreateCirclePayoutRequest): Promise<CirclePayout> {
    try {
      if (!CIRCLE_API_KEY) {
        throw new Error('Circle API key not configured')
      }

      const response = await axios.post(
        `${CIRCLE_API_BASE}/v1/payouts`,
        request,
        { headers: this.getCircleHeaders() }
      )

      logger.info('Circle payout created', { payoutId: response.data.data.id })

      return response.data.data
    } catch (error) {
      logger.error('Failed to create Circle payout', { error: getErrorMessage(error), request })
      throw new Error('Payout creation failed')
    }
  }

  // USDC Transfer Management
  async initiateUSDCTransfer(request: USDCTransferRequest): Promise<USDCTransferResponse> {
    try {
      // This would integrate with CCTP V2 for cross-chain transfers
      logger.info('Initiating USDC transfer', request)

      // In production, this would:
      // 1. Validate source and destination chains
      // 2. Check balances
      // 3. Estimate fees
      // 4. Create burn transaction
      // 5. Wait for attestation
      // 6. Create mint transaction

      return {
        transactionHash: '0x' + Math.random().toString(16).substring(2),
        status: 'pending',
        estimatedConfirmationTime: 300, // 5 minutes
        fees: {
          gas: '0.001',
          bridge: '0.1'
        }
      }
    } catch (error) {
      logger.error('Failed to initiate USDC transfer', { error: getErrorMessage(error), request })
      throw error
    }
  }

  // Payment Analytics using MongoDB aggregation
  async getPaymentAnalytics(merchantId: string, timeframe: string = '30d'): Promise<PaymentAnalytics> {
    try {
      const timeframeDate = new Date()
      if (timeframe === '30d') {
        timeframeDate.setDate(timeframeDate.getDate() - 30)
      } else if (timeframe === '7d') {
        timeframeDate.setDate(timeframeDate.getDate() - 7)
      } else if (timeframe === '1d') {
        timeframeDate.setDate(timeframeDate.getDate() - 1)
      }

      const payments = await Payment.find({
        merchantId,
        createdAt: { $gte: timeframeDate }
      }).exec()

      // Calculate analytics
      const totalVolume: Money = {
        amount: payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toString(),
        currency: 'USD'
      }

      const completedPayments = payments.filter(p => p.status === 'completed')
      const successRate = payments.length > 0 ? (completedPayments.length / payments.length) * 100 : 0

      // Group by chain
      const chainStats = new Map<number, { volume: number; count: number }>()
      payments.forEach(p => {
        const chain = parseInt(p.sourceChain, 10)
        if (!chainStats.has(chain)) {
          chainStats.set(chain, { volume: 0, count: 0 })
        }
        const stats = chainStats.get(chain)!
        stats.volume += parseFloat(p.amount)
        stats.count += 1
      })

      const topChains = Array.from(chainStats.entries())
        .map(([chainId, stats]) => ({
          chainId,
          volume: { amount: stats.volume.toString(), currency: 'USD' as const },
          count: stats.count
        }))
        .sort((a, b) => parseFloat(b.volume.amount) - parseFloat(a.volume.amount))
        .slice(0, 5)

      // Convert recent payments to session format
      const recentTransactions = payments
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map(payment => ({
          sessionId: payment.paymentId,
          merchantId: payment.merchantId,
          merchantWalletAddress: payment.merchantAddress,
          preferredChain: parseInt(payment.sourceChain, 10) as SupportedChainId,
          destinationChain: parseInt(payment.destinationChain, 10) as SupportedChainId,
          amount: payment.amount,
          currency: payment.currency,
          status: this.mapPaymentStatusToSessionStatus(payment.status),
          sourceChain: payment.customerAddress ? parseInt(payment.sourceChain, 10) as SupportedChainId : undefined,
          customerAddress: payment.customerAddress || undefined,
          transactionHash: payment.transactionId || undefined,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          expiresAt: payment.expiresAt || new Date(payment.createdAt.getTime() + 30 * 60 * 1000),
          metadata: payment.metadata
        }))

      return {
        totalVolume,
        totalCount: payments.length,
        successRate,
        averageProcessingTime: 180, // Mock: 3 minutes
        topChains,
        recentTransactions
      }
    } catch (error) {
      logger.error('Failed to get payment analytics', { error: getErrorMessage(error), merchantId })
      throw error
    }
  }

  // Quote Management (unchanged)
  async getPaymentQuote(sourceChain: number, destinationChain: number, amount: string): Promise<PaymentQuote> {
    try {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes

      return {
        id: uuidv4(),
        sourceChain,
        destinationChain,
        amount: { amount, currency: 'USD' },
        fees: { amount: '0.1', currency: 'USD' },
        exchangeRate: '1.0',
        expiresAt,
        estimatedConfirmationTime: sourceChain === destinationChain ? 30 : 300
      }
    } catch (error) {
      logger.error('Failed to get payment quote', { error: getErrorMessage(error), sourceChain, destinationChain, amount })
      throw error
    }
  }

  // Merchant Settings using MongoDB
  async getMerchantSettings(merchantId: string): Promise<MerchantSettings | null> {
    try {
      const merchant = await Merchant.findOne({ merchantId })
      
      if (!merchant) {
        return null
      }

      return {
        merchantId: merchant.merchantId,
        defaultChain: 1, // Could be stored in merchant document
        supportedChains: [1, 137, 8453], // Could be stored in merchant document
        autoAcceptPayments: true,
        riskSettings: {
          maxDailyVolume: { amount: '10000', currency: 'USD' },
          maxSingleTransaction: { amount: '1000', currency: 'USD' },
          requireApprovalThreshold: { amount: '500', currency: 'USD' }
        }
      }
    } catch (error) {
      logger.error('Failed to get merchant settings', { error: getErrorMessage(error), merchantId })
      throw error
    }
  }

  async updateMerchantSettings(merchantId: string, settings: Partial<MerchantSettings>): Promise<MerchantSettings> {
    try {
      let merchant = await Merchant.findOne({ merchantId })
      
      if (!merchant) {
        // Create new merchant if doesn't exist
        merchant = new Merchant({
          merchantId,
          name: 'Unknown Merchant',
          email: `${merchantId}@example.com`,
          walletAddresses: {},
          apiKey: uuidv4(),
          isActive: true
        })
        await merchant.save()
      }

      logger.info('Merchant settings updated', { merchantId, settings })

      const updatedSettings: MerchantSettings = {
        merchantId,
        defaultChain: settings.defaultChain || 1,
        supportedChains: settings.supportedChains || [1, 137, 8453],
        autoAcceptPayments: settings.autoAcceptPayments ?? true,
        riskSettings: settings.riskSettings || {
          maxDailyVolume: { amount: '10000', currency: 'USD' },
          maxSingleTransaction: { amount: '1000', currency: 'USD' },
          requireApprovalThreshold: { amount: '500', currency: 'USD' }
        }
      }

      return updatedSettings
    } catch (error) {
      logger.error('Failed to update merchant settings', { error: getErrorMessage(error), merchantId, settings })
      throw error
    }
  }

  // Validation helpers
  private validateCreatePaymentRequest(request: CreatePaymentSessionRequest): void {
    if (!request.merchantId || !request.merchantWalletAddress || !request.amount) {
      throw new Error('Missing required fields: merchantId, merchantWalletAddress, amount')
    }

    const amount = parseFloat(request.amount)
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number')
    }

    if (!this.isValidChainId(request.preferredChain)) {
      throw new Error('Invalid preferred chain ID')
    }
  }

  private isValidChainId(chainId: number): boolean {
    const supportedChains = [1, 137, 8453, 42161, 10, 43114, 11155111] // Mainnet and testnet chains
    return supportedChains.includes(chainId)
  }

  private isValidStatusTransition(currentStatus: IPayment['status'], newStatus: PaymentStatus): boolean {
    const statusMap: Record<IPayment['status'], PaymentStatus[]> = {
      'created': [PaymentStatus.PENDING, PaymentStatus.EXPIRED, PaymentStatus.CANCELLED],
      'pending': [PaymentStatus.CONFIRMED, PaymentStatus.FAILED, PaymentStatus.CANCELLED],
      'confirmed': [PaymentStatus.BRIDGING, PaymentStatus.COMPLETED, PaymentStatus.FAILED],
      'bridging': [PaymentStatus.COMPLETED, PaymentStatus.FAILED],
      'completed': [],
      'failed': [],
      'expired': [],
      'cancelled': [],
      'refunded': []
    }

    return statusMap[currentStatus]?.includes(newStatus) || false
  }

  private mapPaymentStatusToSessionStatus(status: IPayment['status']): PaymentStatus {
    const statusMap: Record<IPayment['status'], PaymentStatus> = {
      'created': PaymentStatus.CREATED,
      'pending': PaymentStatus.PENDING,
      'confirmed': PaymentStatus.CONFIRMED,
      'bridging': PaymentStatus.BRIDGING,
      'completed': PaymentStatus.COMPLETED,
      'failed': PaymentStatus.FAILED,
      'expired': PaymentStatus.EXPIRED,
      'cancelled': PaymentStatus.CANCELLED,
      'refunded': PaymentStatus.FAILED // Map refunded to failed for now
    }

    return statusMap[status] || PaymentStatus.CREATED
  }

  private mapSessionStatusToPaymentStatus(status: PaymentStatus): IPayment['status'] {
    const statusMap: Record<PaymentStatus, IPayment['status']> = {
      [PaymentStatus.CREATED]: 'created',
      [PaymentStatus.PENDING]: 'pending',
      [PaymentStatus.CONFIRMED]: 'confirmed',
      [PaymentStatus.BRIDGING]: 'bridging',
      [PaymentStatus.COMPLETED]: 'completed',
      [PaymentStatus.FAILED]: 'failed',
      [PaymentStatus.EXPIRED]: 'expired',
      [PaymentStatus.CANCELLED]: 'cancelled'
    }

    return statusMap[status] || 'created'
  }

  // Health check
  async healthCheck(): Promise<{ status: string; circleAPI: string; database: string; timestamp: string }> {
    let circleAPIStatus = 'unknown'
    let databaseStatus = 'unknown'
    
    // Check Circle API
    if (CIRCLE_API_KEY) {
      try {
        await axios.get(`${CIRCLE_API_BASE}/v1/ping`, { 
          headers: this.getCircleHeaders(),
          timeout: 5000 
        })
        circleAPIStatus = 'healthy'
      } catch (error) {
        circleAPIStatus = 'unhealthy'
      }
    } else {
      circleAPIStatus = 'not_configured'
    }

    // Check database
    try {
      await Payment.findOne().limit(1)
      databaseStatus = 'healthy'
    } catch (error) {
      databaseStatus = 'unhealthy'
    }

    return {
      status: 'healthy',
      circleAPI: circleAPIStatus,
      database: databaseStatus,
      timestamp: new Date().toISOString()
    }
  }
}

export default new PaymentService()
