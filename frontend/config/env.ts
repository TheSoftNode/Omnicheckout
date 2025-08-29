// Environment configuration
export const env = {
  // App configuration
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'OmniCheckout',
  APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Multichain USDC Payment Gateway',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Blockchain configuration
  ETHEREUM_RPC_URL: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || '',
  ARBITRUM_RPC_URL: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || '',
  AVALANCHE_RPC_URL: process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL || '',
  BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL || '',

  // Circle USDC Contract Addresses
  ETHEREUM_USDC_ADDRESS: process.env.NEXT_PUBLIC_ETHEREUM_USDC_ADDRESS || '',
  ARBITRUM_USDC_ADDRESS: process.env.NEXT_PUBLIC_ARBITRUM_USDC_ADDRESS || '',
  AVALANCHE_USDC_ADDRESS: process.env.NEXT_PUBLIC_AVALANCHE_USDC_ADDRESS || '',
  BASE_USDC_ADDRESS: process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS || '',

  // Circle CCTP configuration
  CIRCLE_API_URL: process.env.NEXT_PUBLIC_CIRCLE_API_URL || 'https://api.circle.com',
  CIRCLE_ATTESTATION_URL: process.env.NEXT_PUBLIC_CIRCLE_ATTESTATION_URL || 'https://iris-api.circle.com',

  // Feature flags
  GROWTHBOOK_API_HOST: process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST || '',
  GROWTHBOOK_CLIENT_KEY: process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY || '',
  LAUNCHDARKLY_CLIENT_ID: process.env.NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID || '',

  // Analytics
  GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
  MIXPANEL_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '',

  // Monitoring
  SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  VERCEL_ANALYTICS_ID: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID || '',
} as const

// Runtime environment checks
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'

// Feature flags
export const featureFlags = {
  enableAnalytics: isProduction && (!!env.GA_MEASUREMENT_ID || !!env.MIXPANEL_TOKEN),
  enableSentry: isProduction && !!env.SENTRY_DSN,
  enableGrowthBook: !!env.GROWTHBOOK_CLIENT_KEY,
  enableLaunchDarkly: !!env.LAUNCHDARKLY_CLIENT_ID,
} as const
