// Copyright (c) 2025, Circle Technologies, LLC. All rights reserved.
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from 'express'
import paymentService from '../services/paymentService'
import { 
  CreatePaymentSessionRequest, 
  UpdatePaymentSessionRequest,
  PaymentSessionListQuery,
  CreateCirclePaymentRequest,
  CreateCircleTransferRequest,
  CreateCirclePayoutRequest,
  USDCTransferRequest
} from '../interfaces/payment.interface'
import { ApiResponse } from '../types'
import { createLogger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

const logger = createLogger('PaymentController')

export class PaymentController {
  // Payment Session Management
  async createPaymentSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request: CreatePaymentSessionRequest = req.body

      // Validate required fields
      if (!request.merchantId || !request.merchantWalletAddress || !request.preferredChain || !request.amount) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: merchantId, merchantWalletAddress, preferredChain, amount',
          timestamp: new Date().toISOString()
        })
        return
      }

      const session = await paymentService.createPaymentSession(request)

      const response: ApiResponse = {
        success: true,
        data: session,
        timestamp: new Date().toISOString()
      }

      res.status(201).json(response)
    } catch (error) {
      logger.error('Error creating payment session', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  async getPaymentSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
          timestamp: new Date().toISOString()
        })
        return
      }

      const session = await paymentService.getPaymentSession(sessionId)
      
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Payment session not found',
          timestamp: new Date().toISOString()
        })
        return
      }

      const response: ApiResponse = {
        success: true,
        data: session,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Error getting payment session', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  async updatePaymentSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params
      const updates: UpdatePaymentSessionRequest = req.body

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
          timestamp: new Date().toISOString()
        })
        return
      }

      const session = await paymentService.updatePaymentSession(sessionId, updates)
      
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Payment session not found',
          timestamp: new Date().toISOString()
        })
        return
      }

      const response: ApiResponse = {
        success: true,
        data: session,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Error updating payment session', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  async listPaymentSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: PaymentSessionListQuery = {
        merchantId: req.query.merchantId as string,
        status: req.query.status as any,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      }

      const result = await paymentService.listPaymentSessions(query)

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Error listing payment sessions', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  // Circle API Integration
  async createCirclePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request: CreateCirclePaymentRequest = {
        idempotencyKey: req.body.idempotencyKey || uuidv4(),
        ...req.body
      }

      // Validate required fields
      if (!request.amount || !request.source) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: amount, source',
          timestamp: new Date().toISOString()
        })
        return
      }

      const payment = await paymentService.createCirclePayment(request)

      const response: ApiResponse = {
        success: true,
        data: payment,
        timestamp: new Date().toISOString()
      }

      res.status(201).json(response)
    } catch (error) {
      logger.error('Error creating Circle payment', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  async getCirclePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params

      if (!paymentId) {
        res.status(400).json({
          success: false,
          error: 'Payment ID is required',
          timestamp: new Date().toISOString()
        })
        return
      }

      const payment = await paymentService.getCirclePayment(paymentId)

      const response: ApiResponse = {
        success: true,
        data: payment,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Error getting Circle payment', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  async createCircleTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request: CreateCircleTransferRequest = {
        idempotencyKey: req.body.idempotencyKey || uuidv4(),
        ...req.body
      }

      // Validate required fields
      if (!request.source || !request.destination || !request.amount) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: source, destination, amount',
          timestamp: new Date().toISOString()
        })
        return
      }

      const transfer = await paymentService.createCircleTransfer(request)

      const response: ApiResponse = {
        success: true,
        data: transfer,
        timestamp: new Date().toISOString()
      }

      res.status(201).json(response)
    } catch (error) {
      logger.error('Error creating Circle transfer', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  async createCirclePayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request: CreateCirclePayoutRequest = {
        idempotencyKey: req.body.idempotencyKey || uuidv4(),
        ...req.body
      }

      // Validate required fields
      if (!request.destination || !request.amount || !request.sourceWalletId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: destination, amount, sourceWalletId',
          timestamp: new Date().toISOString()
        })
        return
      }

      const payout = await paymentService.createCirclePayout(request)

      const response: ApiResponse = {
        success: true,
        data: payout,
        timestamp: new Date().toISOString()
      }

      res.status(201).json(response)
    } catch (error) {
      logger.error('Error creating Circle payout', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  // USDC Transfer Management
  async initiateUSDCTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request: USDCTransferRequest = req.body

      // Validate required fields
      if (!request.sourceChain || !request.destinationChain || !request.amount || !request.recipientAddress || !request.senderAddress) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: sourceChain, destinationChain, amount, recipientAddress, senderAddress',
          timestamp: new Date().toISOString()
        })
        return
      }

      const transfer = await paymentService.initiateUSDCTransfer(request)

      const response: ApiResponse = {
        success: true,
        data: transfer,
        timestamp: new Date().toISOString()
      }

      res.status(201).json(response)
    } catch (error) {
      logger.error('Error initiating USDC transfer', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  // Analytics and Quotes
  async getPaymentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params
      const timeframe = req.query.timeframe as string || '30d'

      if (!merchantId) {
        res.status(400).json({
          success: false,
          error: 'Merchant ID is required',
          timestamp: new Date().toISOString()
        })
        return
      }

      const analytics = await paymentService.getPaymentAnalytics(merchantId, timeframe)

      const response: ApiResponse = {
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Error getting payment analytics', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  async getPaymentQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sourceChain = parseInt(req.query.sourceChain as string, 10)
      const destinationChain = parseInt(req.query.destinationChain as string, 10)
      const amount = req.query.amount as string

      if (!sourceChain || !destinationChain || !amount) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: sourceChain, destinationChain, amount',
          timestamp: new Date().toISOString()
        })
        return
      }

      const quote = await paymentService.getPaymentQuote(sourceChain, destinationChain, amount)

      const response: ApiResponse = {
        success: true,
        data: quote,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Error getting payment quote', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  // Merchant Settings
  async getMerchantSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params

      if (!merchantId) {
        res.status(400).json({
          success: false,
          error: 'Merchant ID is required',
          timestamp: new Date().toISOString()
        })
        return
      }

      const settings = await paymentService.getMerchantSettings(merchantId)

      if (!settings) {
        res.status(404).json({
          success: false,
          error: 'Merchant settings not found',
          timestamp: new Date().toISOString()
        })
        return
      }

      const response: ApiResponse = {
        success: true,
        data: settings,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Error getting merchant settings', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  async updateMerchantSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params
      const settings = req.body

      if (!merchantId) {
        res.status(400).json({
          success: false,
          error: 'Merchant ID is required',
          timestamp: new Date().toISOString()
        })
        return
      }

      const updatedSettings = await paymentService.updateMerchantSettings(merchantId, settings)

      const response: ApiResponse = {
        success: true,
        data: updatedSettings,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Error updating merchant settings', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  // Health Check
  async healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await paymentService.healthCheck()

      const response: ApiResponse = {
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      }

      res.json(response)
    } catch (error) {
      logger.error('Error during health check', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  // Webhooks
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const webhookPayload = req.body
      const signature = req.headers['circle-signature'] as string

      // In production, validate webhook signature
      logger.info('Received webhook', { 
        type: webhookPayload.type, 
        event: webhookPayload.event,
        id: webhookPayload.id 
      })

      // Process webhook based on type and event
      switch (webhookPayload.type) {
        case 'payment':
          await this.handlePaymentWebhook(webhookPayload)
          break
        case 'transfer':
          await this.handleTransferWebhook(webhookPayload)
          break
        case 'payout':
          await this.handlePayoutWebhook(webhookPayload)
          break
        default:
          logger.warn('Unhandled webhook type', { type: webhookPayload.type })
      }

      res.status(200).json({ received: true })
    } catch (error) {
      logger.error('Error handling webhook', { error: error instanceof Error ? error.message : 'Unknown error' })
      next(error)
    }
  }

  private async handlePaymentWebhook(payload: any): Promise<void> {
    logger.info('Processing payment webhook', { paymentId: payload.data.id, event: payload.event })
    // Update related payment sessions based on payment status
  }

  private async handleTransferWebhook(payload: any): Promise<void> {
    logger.info('Processing transfer webhook', { transferId: payload.data.id, event: payload.event })
    // Update related payment sessions based on transfer status
  }

  private async handlePayoutWebhook(payload: any): Promise<void> {
    logger.info('Processing payout webhook', { payoutId: payload.data.id, event: payload.event })
    // Update related payment sessions based on payout status
  }
}

export default new PaymentController()
