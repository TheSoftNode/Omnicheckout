import { SupportedChainId, ChainInfo } from '../types'

/**
 * Production-ready CCTP V2 Chain Configurations
 * Based on official Circle documentation and sample projects
 * @see https://developers.circle.com/cctp/evm-smart-contracts
 * @see https://developers.circle.com/cctp/solana-programs
 */

// TokenMessengerV2 addresses - identical for all testnet chains
const TESTNET_TOKEN_MESSENGER_ADDRESS = '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA'

// MessageTransmitterV2 addresses - identical for all testnet chains
const TESTNET_MESSAGE_TRANSMITTER_ADDRESS = '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275'

// TokenMinterV2 addresses - identical for all testnet chains
const TESTNET_TOKEN_MINTER_ADDRESS = '0xb43db544E2c27092c107639Ad201b3dEfAbcF192'

// MessageV2 helper contract addresses - identical for all testnet chains (except some variations)
const TESTNET_MESSAGE_V2_ADDRESS = '0xbaC0179bB358A8936169a63408C8481D582390C4'

// Solana program addresses (both testnet and mainnet use same addresses)
const SOLANA_MESSAGE_TRANSMITTER_PROGRAM = 'CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC'
const SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM = 'CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe'

// CCTP V2 Chain configurations based on Circle's official documentation
export const CHAIN_CONFIGS: Record<SupportedChainId, ChainInfo> = {
  [SupportedChainId.ETH_SEPOLIA]: {
    chainId: SupportedChainId.ETH_SEPOLIA,
    name: 'Ethereum Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.ETH_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
    usdcAddress: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: TESTNET_MESSAGE_V2_ADDRESS,
    destinationDomain: 0,
    isTestnet: true,
    blockConfirmations: {
      fast: 2,        // ~20 seconds
      standard: 65    // ~13-19 minutes
    }
  },
  [SupportedChainId.AVAX_FUJI]: {
    chainId: SupportedChainId.AVAX_FUJI,
    name: 'Avalanche Fuji',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    rpcUrl: process.env.AVAX_FUJI_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io',
    usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: TESTNET_MESSAGE_V2_ADDRESS,
    destinationDomain: 1,
    isTestnet: true,
    blockConfirmations: {
      fast: 1,        // ~8 seconds (not available for Avalanche fast)
      standard: 1     // ~8 seconds
    }
  },
  [SupportedChainId.BASE_SEPOLIA]: {
    chainId: SupportedChainId.BASE_SEPOLIA,
    name: 'Base Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: TESTNET_MESSAGE_V2_ADDRESS,
    destinationDomain: 6,
    isTestnet: true,
    blockConfirmations: {
      fast: 1,        // ~8 seconds
      standard: 65    // ~13-19 minutes (waits for ETH finality)
    }
  },
  [SupportedChainId.ARBITRUM_SEPOLIA]: {
    chainId: SupportedChainId.ARBITRUM_SEPOLIA,
    name: 'Arbitrum Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: TESTNET_MESSAGE_V2_ADDRESS,
    destinationDomain: 3,
    isTestnet: true,
    blockConfirmations: {
      fast: 1,        // ~8 seconds
      standard: 65    // ~13-19 minutes (waits for ETH finality)
    }
  },
  [SupportedChainId.LINEA_SEPOLIA]: {
    chainId: SupportedChainId.LINEA_SEPOLIA,
    name: 'Linea Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.LINEA_SEPOLIA_RPC_URL || 'https://rpc.sepolia.linea.build',
    blockExplorer: 'https://sepolia.lineascan.build',
    usdcAddress: '0xFEce4462D57bD51A6A552365A011b95f0E16d9B7',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: TESTNET_MESSAGE_V2_ADDRESS,
    destinationDomain: 11,
    isTestnet: true,
    blockConfirmations: {
      fast: 1,           // ~8 seconds
      standard: 8640     // ~6-32 hours (Linea hard finality)
    }
  },
  [SupportedChainId.SONIC_BLAZE]: {
    chainId: SupportedChainId.SONIC_BLAZE,
    name: 'Sonic Blaze',
    nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18 },
    rpcUrl: process.env.SONIC_BLAZE_RPC_URL || 'https://rpc.blaze.soniclabs.com',
    blockExplorer: 'https://blaze.soniclabs.com',
    usdcAddress: '0xA4879Fed32Ecbef99399e5cbC247E533421C4eC6',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: TESTNET_MESSAGE_V2_ADDRESS,
    destinationDomain: 13,
    isTestnet: true,
    blockConfirmations: {
      fast: 1,        // ~8 seconds
      standard: 1     // ~8 seconds
    }
  },
  [SupportedChainId.WORLDCHAIN_SEPOLIA]: {
    chainId: SupportedChainId.WORLDCHAIN_SEPOLIA,
    name: 'Worldchain Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.WORLDCHAIN_SEPOLIA_RPC_URL || 'https://worldchain-sepolia.g.alchemy.com/v2/demo',
    blockExplorer: 'https://sepolia.worldscan.org',
    usdcAddress: '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: TESTNET_MESSAGE_V2_ADDRESS,
    destinationDomain: 14,
    isTestnet: true,
    blockConfirmations: {
      fast: 1,        // ~8 seconds
      standard: 65    // ~13-19 minutes (waits for ETH finality)
    }
  },
  [SupportedChainId.OPTIMISM_SEPOLIA]: {
    chainId: SupportedChainId.OPTIMISM_SEPOLIA,
    name: 'Optimism Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    blockExplorer: 'https://sepolia-optimism.etherscan.io',
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: TESTNET_MESSAGE_V2_ADDRESS,
    destinationDomain: 2,
    isTestnet: true,
    blockConfirmations: {
      fast: 1,        // ~8 seconds
      standard: 65    // ~13-19 minutes (waits for ETH finality)
    }
  },
  [SupportedChainId.SOLANA_DEVNET]: {
    chainId: SupportedChainId.SOLANA_DEVNET,
    name: 'Solana Devnet',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    rpcUrl: process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
    blockExplorer: 'https://explorer.solana.com',
    usdcAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    tokenMessengerAddress: SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM,
    messageTransmitterAddress: SOLANA_MESSAGE_TRANSMITTER_PROGRAM,
    // Solana doesn't have separate token minter and message helper addresses
    tokenMinterAddress: SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM,
    messageV2Address: SOLANA_MESSAGE_TRANSMITTER_PROGRAM,
    destinationDomain: 5,
    isTestnet: true,
    blockConfirmations: {
      fast: 3,        // ~8 seconds (2-3 blocks for confirmation)
      standard: 32    // ~25 seconds (32 blocks for finality)
    }
  },
  [SupportedChainId.CODEX_TESTNET]: {
    chainId: SupportedChainId.CODEX_TESTNET,
    name: 'Codex Testnet',
    nativeCurrency: { name: 'Codex', symbol: 'CDX', decimals: 18 },
    rpcUrl: process.env.CODEX_TESTNET_RPC_URL || 'https://812242.rpc.thirdweb.com',
    blockExplorer: 'https://explorer.codex-stg.xyz',
    usdcAddress: '0x6d7f141b6819C2c9CC2f818e6ad549E7Ca090F8f',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: '0xbac0179bb358a8936169a63408c8481d582390c4', // lowercase variant
    destinationDomain: 12,
    isTestnet: true,
    blockConfirmations: {
      fast: 1,        // ~8 seconds
      standard: 65    // ~13-19 minutes (waits for ETH finality)
    }
  },
  [SupportedChainId.UNICHAIN_SEPOLIA]: {
    chainId: SupportedChainId.UNICHAIN_SEPOLIA,
    name: 'Unichain Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.UNICHAIN_SEPOLIA_RPC_URL || 'https://sepolia.unichain.org',
    blockExplorer: 'https://sepolia.uniscan.xyz',
    usdcAddress: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: TESTNET_MESSAGE_V2_ADDRESS,
    destinationDomain: 10,
    isTestnet: true,
    blockConfirmations: {
      fast: 1,        // ~8 seconds
      standard: 65    // ~13-19 minutes (waits for ETH finality)
    }
  },
  [SupportedChainId.POLYGON_AMOY]: {
    chainId: SupportedChainId.POLYGON_AMOY,
    name: 'Polygon Amoy',
    nativeCurrency: { name: 'Polygon', symbol: 'POL', decimals: 18 },
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://amoy.polygonscan.com',
    usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: '0xbac0179bb358a8936169a63408c8481d582390c4', // lowercase variant
    destinationDomain: 7,
    isTestnet: true,
    blockConfirmations: {
      fast: 3,        // ~2 seconds (not available for Polygon fast)
      standard: 3     // ~8 seconds
    }
  },
  [SupportedChainId.SEI_TESTNET]: {
    chainId: SupportedChainId.SEI_TESTNET,
    name: 'Sei Testnet',
    nativeCurrency: { name: 'Sei', symbol: 'SEI', decimals: 18 },
    rpcUrl: process.env.SEI_TESTNET_RPC_URL || 'https://evm-rpc-testnet.sei-apis.com',
    blockExplorer: 'https://seitrace.com',
    usdcAddress: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
    tokenMessengerAddress: TESTNET_TOKEN_MESSENGER_ADDRESS,
    messageTransmitterAddress: TESTNET_MESSAGE_TRANSMITTER_ADDRESS,
    tokenMinterAddress: TESTNET_TOKEN_MINTER_ADDRESS,
    messageV2Address: TESTNET_MESSAGE_V2_ADDRESS,
    destinationDomain: 16,
    isTestnet: true,
    blockConfirmations: {
      fast: 1,        // ~5 seconds (not available for Sei fast)
      standard: 1     // ~5 seconds
    }
  }
}

export const SUPPORTED_CHAINS = Object.values(CHAIN_CONFIGS)

/**
 * Get chain configuration by chain ID
 * @param chainId The chain ID to get configuration for
 * @returns Chain configuration object
 * @throws Error if chain ID is not supported
 */
export const getChainConfig = (chainId: SupportedChainId): ChainInfo => {
  const config = CHAIN_CONFIGS[chainId]
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(CHAIN_CONFIGS).join(', ')}`)
  }
  return config
}

/**
 * Check if a chain ID is valid and supported
 * @param chainId The chain ID to validate
 * @returns True if the chain ID is supported
 */
export const isValidChainId = (chainId: number): chainId is SupportedChainId => {
  return Object.values(SupportedChainId).includes(chainId as SupportedChainId)
}

/**
 * Check if a chain is Solana-based
 * @param chainId The chain ID to check
 * @returns True if the chain is Solana
 */
export const isSolanaChain = (chainId: SupportedChainId): boolean => {
  return chainId === SupportedChainId.SOLANA_DEVNET
}

/**
 * Check if a chain is EVM-compatible
 * @param chainId The chain ID to check
 * @returns True if the chain is EVM-compatible
 */
export const isEVMChain = (chainId: SupportedChainId): boolean => {
  return !isSolanaChain(chainId)
}

/**
 * Get chains filtered by type
 * @param type Chain type filter
 * @returns Array of filtered chain configurations
 */
export const getChainsByType = (type: 'evm' | 'solana' | 'all' = 'all'): ChainInfo[] => {
  switch (type) {
    case 'evm':
      return SUPPORTED_CHAINS.filter(chain => isEVMChain(chain.chainId))
    case 'solana':
      return SUPPORTED_CHAINS.filter(chain => isSolanaChain(chain.chainId))
    default:
      return SUPPORTED_CHAINS
  }
}

/**
 * Get chain configuration by destination domain
 * @param domain The destination domain to find
 * @returns Chain configuration object or undefined if not found
 */
export const getChainByDomain = (domain: number): ChainInfo | undefined => {
  return SUPPORTED_CHAINS.find(chain => chain.destinationDomain === domain)
}

// USDC standard configuration
export const USDC_DECIMALS = 6

// Circle's IRIS API URLs for attestation service
export const IRIS_API_URLS = {
  testnet: 'https://iris-api-sandbox.circle.com',
  mainnet: 'https://iris-api.circle.com'
} as const

// CCTP V2 finality thresholds
export const FINALITY_THRESHOLDS = {
  fast: 1000,      // Fast Transfer - confirmed
  standard: 2000   // Standard Transfer - finalized
} as const

// Maximum amount limits (in USDC units, can be configured per environment)
export const TRANSFER_LIMITS = {
  min: '0.01',     // Minimum transfer amount
  max: '10000',    // Maximum transfer amount for testnet
  dailyLimit: '50000' // Daily limit per address
} as const

// Rate limiting configuration
export const RATE_LIMITS = {
  transfersPerHour: 10,
  transfersPerDay: 100,
  windowSize: 3600000, // 1 hour in milliseconds
  maxConcurrentTransfers: 3
} as const

// Gas limits for EVM chains (in units)
export const GAS_LIMITS = {
  depositForBurn: 200000,
  depositForBurnWithHook: 300000,
  receiveMessage: 400000,
  approve: 60000
} as const

// Fee configuration
export const FEE_CONFIG = {
  maxSlippageBps: 50,    // 0.5% max slippage
  defaultMaxFeeBps: 100, // 1% default max fee
  priorityFeeBps: 10     // 0.1% priority fee for fast transfers
} as const
