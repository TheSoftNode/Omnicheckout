import type { SUPPORTED_CHAINS } from '@/config/chains'

// Chain and network types
export type ChainId = keyof typeof SUPPORTED_CHAINS
export type Chain = typeof SUPPORTED_CHAINS[ChainId]

// Transfer types
export interface TransferRequest {
  sourceChain: ChainId
  destinationChain: ChainId
  amount: string
  recipient: string
  charityAddress?: string
  charityPercentage?: number
  deadline?: number
}

export interface TransferResponse {
  transferId: string
  sourceTxHash: string
  sourceChain: ChainId
  destinationChain: ChainId
  amount: string
  recipient: string
  status: TransferStatus
  attestationHash?: string
  destinationTxHash?: string
  charityAmount?: string
  fee: string
  createdAt: string
  updatedAt: string
}

export enum TransferStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ATTESTED = 'attested',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

// Wallet types
export interface WalletState {
  address: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
}

export interface WalletProvider {
  name: string
  icon: string
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  switchChain: (chainId: number) => Promise<void>
}

// Balance types
export interface TokenBalance {
  address: string
  symbol: string
  decimals: number
  balance: string
  formattedBalance: string
  usdValue?: string
}

// Transaction types
export interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  gasLimit: string
  gasPrice: string
  nonce: number
  data: string
  chainId: number
}

export interface TransactionReceipt {
  hash: string
  status: 'success' | 'failed'
  blockNumber: number
  blockHash: string
  gasUsed: string
  effectiveGasPrice: string
  logs: TransactionLog[]
}

export interface TransactionLog {
  address: string
  topics: string[]
  data: string
  blockNumber: number
  transactionHash: string
  logIndex: number
}

// Fee estimation types
export interface FeeEstimate {
  sourceChain: ChainId
  destinationChain: ChainId
  amount: string
  estimatedFee: string
  estimatedTime: number // in seconds
  gasEstimate: string
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Error types
export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

// UI types
export interface LoadingState {
  isLoading: boolean
  error: string | null
}

export interface FormState<T = Record<string, any>> extends LoadingState {
  data: T
  isDirty: boolean
  isValid: boolean
  errors: Record<string, string>
}

// Feature flag types
export interface FeatureFlags {
  enableAdvancedTrading: boolean
  enableCrossChainSwap: boolean
  enableCharityDonations: boolean
  enablePriceAlerts: boolean
  enablePortfolioTracking: boolean
  maintenanceMode: boolean
}

// Analytics types
export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  userId?: string
  timestamp?: number
}

export interface PageViewEvent extends AnalyticsEvent {
  name: 'page_view'
  properties: {
    page: string
    title: string
    referrer?: string
  }
}

export interface TransferEvent extends AnalyticsEvent {
  name: 'transfer_initiated' | 'transfer_completed' | 'transfer_failed'
  properties: {
    transferId: string
    sourceChain: ChainId
    destinationChain: ChainId
    amount: string
    fee: string
    duration?: number
  }
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'

// Notification types
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Settings types
export interface UserSettings {
  theme: Theme
  currency: string
  language: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  privacy: {
    analytics: boolean
    marketing: boolean
  }
}

// Chart data types
export interface ChartDataPoint {
  timestamp: number
  value: number
  label?: string
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie'
  data: ChartDataPoint[]
  xAxisLabel?: string
  yAxisLabel?: string
  color?: string
  gradient?: boolean
}

// Search types
export interface SearchResult {
  id: string
  type: 'transaction' | 'address' | 'token'
  title: string
  subtitle?: string
  url: string
  metadata?: Record<string, any>
}

// Export utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type WithLoading<T> = T & LoadingState
export type WithTimestamps = {
  createdAt: string
  updatedAt: string
}
