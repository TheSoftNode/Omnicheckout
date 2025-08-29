import { SupportedChainId, ChainInfo } from '../types'

// Chain configurations based on Circle's CCTP V2 documentation
export const CHAIN_CONFIGS: Record<SupportedChainId, ChainInfo> = {
  [SupportedChainId.ETH_SEPOLIA]: {
    chainId: SupportedChainId.ETH_SEPOLIA,
    name: 'Ethereum Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
    usdcAddress: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 0,
    isTestnet: true
  },
  [SupportedChainId.AVAX_FUJI]: {
    chainId: SupportedChainId.AVAX_FUJI,
    name: 'Avalanche Fuji',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io',
    usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 1,
    isTestnet: true
  },
  [SupportedChainId.BASE_SEPOLIA]: {
    chainId: SupportedChainId.BASE_SEPOLIA,
    name: 'Base Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 6,
    isTestnet: true
  },
  [SupportedChainId.ARBITRUM_SEPOLIA]: {
    chainId: SupportedChainId.ARBITRUM_SEPOLIA,
    name: 'Arbitrum Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 3,
    isTestnet: true
  },
  [SupportedChainId.LINEA_SEPOLIA]: {
    chainId: SupportedChainId.LINEA_SEPOLIA,
    name: 'Linea Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://rpc.sepolia.linea.build',
    blockExplorer: 'https://sepolia.lineascan.build',
    usdcAddress: '0xFEce4462D57bD51A6A552365A011b95f0E16d9B7',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 11,
    isTestnet: true
  },
  [SupportedChainId.SONIC_BLAZE]: {
    chainId: SupportedChainId.SONIC_BLAZE,
    name: 'Sonic Blaze',
    nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18 },
    rpcUrl: 'https://rpc.blaze.soniclabs.com',
    blockExplorer: 'https://blaze.soniclabs.com',
    usdcAddress: '0xA4879Fed32Ecbef99399e5cbC247E533421C4eC6',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 13,
    isTestnet: true
  },
  [SupportedChainId.WORLDCHAIN_SEPOLIA]: {
    chainId: SupportedChainId.WORLDCHAIN_SEPOLIA,
    name: 'Worldchain Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://worldchain-sepolia.g.alchemy.com/v2/demo',
    blockExplorer: 'https://sepolia.worldscan.org',
    usdcAddress: '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 14,
    isTestnet: true
  },
  [SupportedChainId.OPTIMISM_SEPOLIA]: {
    chainId: SupportedChainId.OPTIMISM_SEPOLIA,
    name: 'Optimism Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://sepolia.optimism.io',
    blockExplorer: 'https://sepolia-optimism.etherscan.io',
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 2,
    isTestnet: true
  },
  [SupportedChainId.SOLANA_DEVNET]: {
    chainId: SupportedChainId.SOLANA_DEVNET,
    name: 'Solana Devnet',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    rpcUrl: 'https://api.devnet.solana.com',
    blockExplorer: 'https://explorer.solana.com',
    usdcAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    tokenMessengerAddress: 'CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe',
    messageTransmitterAddress: 'CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC',
    destinationDomain: 5,
    isTestnet: true
  },
  [SupportedChainId.CODEX_TESTNET]: {
    chainId: SupportedChainId.CODEX_TESTNET,
    name: 'Codex Testnet',
    nativeCurrency: { name: 'Codex', symbol: 'CDX', decimals: 18 },
    rpcUrl: 'https://812242.rpc.thirdweb.com',
    blockExplorer: 'https://explorer.codex-stg.xyz',
    usdcAddress: '0x6d7f141b6819C2c9CC2f818e6ad549E7Ca090F8f',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 12,
    isTestnet: true
  },
  [SupportedChainId.UNICHAIN_SEPOLIA]: {
    chainId: SupportedChainId.UNICHAIN_SEPOLIA,
    name: 'Unichain Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://sepolia.unichain.org',
    blockExplorer: 'https://sepolia.uniscan.xyz',
    usdcAddress: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 10,
    isTestnet: true
  },
  [SupportedChainId.POLYGON_AMOY]: {
    chainId: SupportedChainId.POLYGON_AMOY,
    name: 'Polygon Amoy',
    nativeCurrency: { name: 'Polygon', symbol: 'POL', decimals: 18 },
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://amoy.polygonscan.com',
    usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 7,
    isTestnet: true
  },
  [SupportedChainId.SEI_TESTNET]: {
    chainId: SupportedChainId.SEI_TESTNET,
    name: 'Sei Testnet',
    nativeCurrency: { name: 'Sei', symbol: 'SEI', decimals: 18 },
    rpcUrl: 'https://evm-rpc-testnet.sei-apis.com',
    blockExplorer: 'https://seitrace.com',
    usdcAddress: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
    tokenMessengerAddress: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
    messageTransmitterAddress: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
    destinationDomain: 16,
    isTestnet: true
  }
}

export const SUPPORTED_CHAINS = Object.values(CHAIN_CONFIGS)

export const getChainConfig = (chainId: SupportedChainId): ChainInfo => {
  const config = CHAIN_CONFIGS[chainId]
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }
  return config
}

export const isValidChainId = (chainId: number): chainId is SupportedChainId => {
  return Object.values(SupportedChainId).includes(chainId as SupportedChainId)
}

export const isSolanaChain = (chainId: SupportedChainId): boolean => {
  return chainId === SupportedChainId.SOLANA_DEVNET
}

// Default USDC decimals
export const USDC_DECIMALS = 6

// API URLs
export const IRIS_API_URLS = {
  testnet: 'https://iris-api-sandbox.circle.com',
  mainnet: 'https://iris-api.circle.com'
}

// Default finality thresholds for CCTP V2
export const FINALITY_THRESHOLDS = {
  fast: 1000,
  standard: 2000
} as const
