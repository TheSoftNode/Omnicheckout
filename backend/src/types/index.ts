// Chain and Network Types
export enum SupportedChainId {
  ETH_SEPOLIA = 11155111,
  AVAX_FUJI = 43113,
  BASE_SEPOLIA = 84532,
  MATIC_AMOY = 80002,
  SONIC_BLAZE = 57054,
  LINEA_SEPOLIA = 59141,
  ARBITRUM_SEPOLIA = 421614,
  WORLDCHAIN_SEPOLIA = 4801,
  OPTIMISM_SEPOLIA = 11155420,
  SOLANA_DEVNET = 103,
  CODEX_TESTNET = 812242,
  UNICHAIN_SEPOLIA = 1301,
  POLYGON_AMOY = 80002,
  SEI_TESTNET = 1328,
}

export interface ChainInfo {
  chainId: SupportedChainId
  name: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrl: string
  blockExplorer: string
  usdcAddress: string
  tokenMessengerAddress: string
  messageTransmitterAddress: string
  destinationDomain: number
  isTestnet: boolean
  logo?: string
}

// Payment Types
export interface PaymentSession {
  sessionId: string
  merchantId: string
  merchantWalletAddress: string
  preferredChain: SupportedChainId
  amount: string
  sourceChain?: SupportedChainId
  destinationChain: SupportedChainId
  customerAddress?: string
  status: PaymentStatus
  transactionHash?: string
  attestationHash?: string
  mintTransactionHash?: string
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
  metadata?: Record<string, any>
}

export enum PaymentStatus {
  CREATED = 'created',
  PENDING_APPROVAL = 'pending_approval',
  PENDING_BURN = 'pending_burn',
  BURNED = 'burned',
  PENDING_ATTESTATION = 'pending_attestation',
  ATTESTED = 'attested',
  PENDING_MINT = 'pending_mint',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

// CCTP Types
export interface CCTPTransferRequest {
  sourceChain: SupportedChainId
  destinationChain: SupportedChainId
  amount: string
  sourceAddress: string
  destinationAddress: string
  transferType: 'fast' | 'standard'
  sessionId?: string
  hookData?: string
}

export interface CCTPTransferResponse {
  transactionHash: string
  sourceChain: SupportedChainId
  destinationChain: SupportedChainId
  amount: string
  status: PaymentStatus
  sessionId?: string
}

export interface AttestationResponse {
  status: 'pending' | 'complete'
  attestation?: string
  message?: string
  transactionHash: string
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface ErrorResponse {
  success: false
  error: string
  message?: string
  timestamp: string
  statusCode: number
}

// Webhook Types
export interface CircleWebhookPayload {
  id: string
  type: string
  data: {
    transactionHash: string
    status: string
    amount: string
    sourceChain: string
    destinationChain: string
    [key: string]: any
  }
  timestamp: string
}

// Configuration Types
export interface AppConfig {
  port: number
  nodeEnv: string
  corsOrigin: string
  circleApiKey: string
  circleEntitySecret: string
  evmPrivateKey: string
  solanaPrivateKey: string
  irisApiUrl: string
  databaseUrl: string
  webhookSecret: string
  logLevel: string
  rateLimitWindowMs: number
  rateLimitMaxRequests: number
  sessionTimeoutMinutes: number
  defaultFeePercentage: number
}

// Balance Types
export interface BalanceResponse {
  chainId: SupportedChainId
  address: string
  balance: string
  symbol: 'USDC'
  decimals: number
}

// Transaction Types
export interface TransactionStatus {
  transactionHash: string
  chainId: SupportedChainId
  status: 'pending' | 'confirmed' | 'failed'
  blockNumber?: number
  confirmations?: number
  gasUsed?: string
  effectiveGasPrice?: string
}

// Merchant Types
export interface MerchantProfile {
  merchantId: string
  name: string
  email: string
  walletAddress: string
  preferredChain: SupportedChainId
  webhookUrl?: string
  apiKey: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Hook Types for CCTP V2
export interface CCTPHook {
  hookType: 'charity_donation' | 'fee_collection' | 'custom'
  percentage?: number
  recipientAddress?: string
  data?: string
}

export interface HookExecution {
  hookId: string
  transactionHash: string
  chainId: SupportedChainId
  status: 'pending' | 'executed' | 'failed'
  amount: string
  recipientAddress: string
  executedAt?: Date
}
