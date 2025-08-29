import omniCheckoutHookService from '../services/omniCheckoutHookService'
import { SupportedChainId } from '../types'
import { createLogger } from '../utils/logger'
import OmniCheckoutHookABI from '../abis/OmniCheckoutHook.json'

const logger = createLogger('IntegrationTest')

/**
 * Test script to verify smart contract backend integration
 */
async function testIntegration() {
  logger.info('🔧 Testing OmniCheckout Smart Contract Integration...')
  
  try {
    // Test 1: ABI loading
    logger.info('📄 Testing ABI loading...')
    if (OmniCheckoutHookABI && OmniCheckoutHookABI.length > 0) {
      logger.info('✅ ABI loaded successfully')
    } else {
      throw new Error('ABI not loaded')
    }

    // Test 2: Hook data generation
    logger.info('🔧 Testing hook data generation...')
    const testCharityPercentage = 250 // 2.5%

    const hookData = omniCheckoutHookService.generateHookData(testCharityPercentage)
    
    if (hookData && hookData.length > 0) {
      logger.info('✅ Hook data generation successful')
      logger.info(`🔗 Generated data: ${hookData}`)
    } else {
      throw new Error('Hook data generation failed')
    }

    // Test 3: Contract address management
    logger.info('🌐 Testing contract address management...')
    const testChainId = SupportedChainId.ETH_SEPOLIA
    const testAddress = '0x1234567890123456789012345678901234567890'
    
    omniCheckoutHookService.setDeployedAddress(testChainId, testAddress)
    const deployedAddresses = omniCheckoutHookService.getDeployedAddresses()
    
    if (deployedAddresses[testChainId] === testAddress) {
      logger.info('✅ Contract address management working')
    } else {
      throw new Error('Contract address management failed')
    }

    // Test 4: Contract availability check
    logger.info('🔍 Testing contract availability check...')
    const isDeployed = omniCheckoutHookService.isDeployedOnChain(testChainId)
    if (isDeployed) {
      logger.info('✅ Contract availability check working')
    } else {
      logger.info('ℹ️  Contract not deployed on test chain (expected)')
    }

    // Test 5: Health check
    logger.info('🏥 Testing service health check...')
    const healthStatus = await omniCheckoutHookService.healthCheck()
    if (healthStatus.status === 'healthy') {
      logger.info('✅ Service health check passed')
      logger.info(`📊 Deployed chains: ${healthStatus.deployedChains.length}`)
    } else {
      throw new Error('Service health check failed')
    }

    logger.info('🎉 All integration tests passed!')
    return true

  } catch (error) {
    logger.error('❌ Integration test failed:', error)
    return false
  }
}

// Export for use in other scripts
export { testIntegration }

// Run tests if called directly
if (require.main === module) {
  testIntegration().then(success => {
    process.exit(success ? 0 : 1)
  })
}
