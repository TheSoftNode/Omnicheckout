import { SupportedChainId } from '../types'

export interface ChainInfo {
  chainId: SupportedChainId
  name: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrl: string
  blockExplorerUrl: string
  isTestnet: boolean
  destinationDomain: number
  usdcAddress: string
  tokenMessengerAddress: string
  messageTransmitterAddress: string
  tokenMinterAddress: string
  messageV2Address: string
}

export interface BalanceInfo {
  chainId: SupportedChainId
  address: string
  balance: string
  symbol: string
  decimals: number
  tokenAddress: string
}

export interface TransactionStatus {
  transactionHash: string
  chainId: SupportedChainId
  status: 'pending' | 'confirmed' | 'failed'
  blockNumber?: number
  confirmations?: number
  gasUsed?: string
  effectiveGasPrice?: string
  timestamp?: number
}

export interface ChainService {
  getSupportedChains(): Promise<Omit<ChainInfo, 'rpcUrl'>[]>
  getChainInfo(chainId: SupportedChainId): Promise<Omit<ChainInfo, 'rpcUrl'>>
  getBalance(chainId: SupportedChainId, address: string): Promise<BalanceInfo>
  getTransactionStatus(chainId: SupportedChainId, txHash: string): Promise<TransactionStatus>
  validateChainSupport(chainId: number): boolean
  validateAddress(chainId: SupportedChainId, address: string): boolean
}

export interface ChainHealthCheck {
  chainId: SupportedChainId
  rpcStatus: 'healthy' | 'unhealthy' | 'degraded'
  latency: number
  blockHeight: number
  lastChecked: Date
}
