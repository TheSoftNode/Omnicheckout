// Supported blockchain networks
export const SUPPORTED_CHAINS = {
  ETHEREUM: {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || '',
    blockExplorer: 'https://etherscan.io',
    usdcAddress: process.env.NEXT_PUBLIC_ETHEREUM_USDC_ADDRESS || '0xA0b86a33E6441b50C9b2F63c6c5E14e9d8d55e6e',
    tokenMessengerAddress: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
    messageTransmitterAddress: '0x0a992d191DEeC32aFE36203Ad87D7d289a738F81',
    cctpDomain: 0,
    icon: '/icons/ethereum.svg',
    color: '#627EEA',
  },
  ARBITRUM: {
    id: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || '',
    blockExplorer: 'https://arbiscan.io',
    usdcAddress: process.env.NEXT_PUBLIC_ARBITRUM_USDC_ADDRESS || '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    tokenMessengerAddress: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
    messageTransmitterAddress: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
    cctpDomain: 3,
    icon: '/icons/arbitrum.svg',
    color: '#28A0F0',
  },
  AVALANCHE: {
    id: 43114,
    name: 'Avalanche C-Chain',
    symbol: 'AVAX',
    rpcUrl: process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    blockExplorer: 'https://snowtrace.io',
    usdcAddress: process.env.NEXT_PUBLIC_AVALANCHE_USDC_ADDRESS || '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    tokenMessengerAddress: '0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982',
    messageTransmitterAddress: '0x8186359aF5F57FbB40c6b14A588d2A59C0C29880',
    cctpDomain: 1,
    icon: '/icons/avalanche.svg',
    color: '#E84142',
  },
  BASE: {
    id: 8453,
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    usdcAddress: process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    tokenMessengerAddress: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
    messageTransmitterAddress: '0xAD09780d193884d503182aD4588450C416D6F9D4',
    cctpDomain: 6,
    icon: '/icons/base.svg',
    color: '#0052FF',
  },
} as const

export type ChainId = keyof typeof SUPPORTED_CHAINS
export type Chain = typeof SUPPORTED_CHAINS[ChainId]

// Default chain
export const DEFAULT_CHAIN: ChainId = 'ETHEREUM'

// Chain utilities
export function getChainById(chainId: number): Chain | undefined {
  return Object.values(SUPPORTED_CHAINS).find(chain => chain.id === chainId)
}

export function getChainByName(name: string): Chain | undefined {
  return Object.values(SUPPORTED_CHAINS).find(
    chain => chain.name.toLowerCase() === name.toLowerCase()
  )
}

export function isChainSupported(chainId: number): boolean {
  return Object.values(SUPPORTED_CHAINS).some(chain => chain.id === chainId)
}

// Circle CCTP configuration
export const CCTP_CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_CIRCLE_API_URL || 'https://api.circle.com',
  ATTESTATION_URL: process.env.NEXT_PUBLIC_CIRCLE_ATTESTATION_URL || 'https://iris-api.circle.com',
  ATTESTATION_ENDPOINT: '/attestations',
} as const

// Contract addresses and configurations
export const CONTRACT_ADDRESSES = {
  OMNI_CHECKOUT_HOOK: {
    ETHEREUM: process.env.NEXT_PUBLIC_OMNI_CHECKOUT_HOOK_ETHEREUM || '',
    ARBITRUM: process.env.NEXT_PUBLIC_OMNI_CHECKOUT_HOOK_ARBITRUM || '',
    AVALANCHE: process.env.NEXT_PUBLIC_OMNI_CHECKOUT_HOOK_AVALANCHE || '',
    BASE: process.env.NEXT_PUBLIC_OMNI_CHECKOUT_HOOK_BASE || '',
  },
} as const

// Transaction configuration
export const TRANSACTION_CONFIG = {
  DEFAULT_GAS_LIMIT: 300000,
  MAX_GAS_LIMIT: 1000000,
  GAS_LIMIT_BUFFER: 1.2, // 20% buffer
  CONFIRMATION_BLOCKS: {
    ETHEREUM: 12,
    ARBITRUM: 1,
    AVALANCHE: 1,
    BASE: 1,
  },
  POLL_INTERVAL: 2000, // 2 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
} as const

// API endpoints
export const API_ENDPOINTS = {
  TRANSFER: '/api/transfers',
  STATUS: '/api/transfers/status',
  HISTORY: '/api/transfers/history',
  FEES: '/api/fees',
  RATES: '/api/rates',
  HEALTH: '/api/health',
} as const
