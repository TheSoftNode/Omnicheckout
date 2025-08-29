import { ethers } from 'ethers'
import { createLogger } from '../utils/logger'
import { getConfig } from '../config'
import { getChainConfig } from '../config/chains'
import { SupportedChainId } from '../types'
import OmniCheckoutHookABI from '../abis/OmniCheckoutHook.json'

const logger = createLogger('OmniCheckoutHookService')
const config = getConfig()

export interface HookConfig {
  charityAddress: string
  charityPercentage: number
}

export interface HookExecution {
  transactionHash: string
  recipient: string
  amount: string
  charityAmount: string
  charityAddress: string
}

// Deployed contract addresses (to be updated after deployment)
const DEPLOYED_HOOK_ADDRESSES: Partial<Record<SupportedChainId, string>> = {
  // These will be populated after deployment
  // [SupportedChainId.ETH_SEPOLIA]: '0x...',
  // [SupportedChainId.BASE_SEPOLIA]: '0x...',
  // [SupportedChainId.ARBITRUM_SEPOLIA]: '0x...',
}

export class OmniCheckoutHookService {
  /**
   * Get the OmniCheckoutHook contract address for a specific chain
   */
  getHookAddress(chainId: SupportedChainId): string {
    const address = DEPLOYED_HOOK_ADDRESSES[chainId]
    if (!address) {
      throw new Error(`OmniCheckoutHook not deployed on chain ${chainId}`)
    }
    return address
  }

  /**
   * Generate hook data for CCTP transfers with charity donation
   */
  generateHookData(charityPercentage: number = 250): string {
    try {
      // For simple charity hook, we can encode the percentage as bytes
      // This is a simplified version - in production you might want more complex data
      const paddedPercentage = ethers.zeroPadValue(ethers.toBeHex(charityPercentage), 32)
      
      logger.info('Generated hook data', { 
        charityPercentage,
        hookData: paddedPercentage
      })

      return paddedPercentage
    } catch (error) {
      logger.error('Failed to generate hook data', { error, charityPercentage })
      throw new Error('Failed to generate hook data')
    }
  }

  /**
   * Get charity configuration from deployed hook contract
   */
  async getCharityConfig(chainId: SupportedChainId): Promise<HookConfig> {
    try {
      const chainConfig = getChainConfig(chainId)
      const hookAddress = this.getHookAddress(chainId)
      
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
      const hookContract = new ethers.Contract(hookAddress, OmniCheckoutHookABI, provider)

      const [charityAddress, charityPercentage] = await hookContract.getCharityConfig()

      logger.info('Retrieved charity config', {
        chainId,
        charityAddress,
        charityPercentage: charityPercentage.toString()
      })

      return {
        charityAddress,
        charityPercentage: Number(charityPercentage)
      }
    } catch (error) {
      logger.error('Failed to get charity config', { error, chainId })
      throw error
    }
  }

  /**
   * Update charity configuration (only owner can call this)
   */
  async updateCharityConfig(
    chainId: SupportedChainId,
    charityAddress: string,
    charityPercentage: number
  ): Promise<string> {
    try {
      const chainConfig = getChainConfig(chainId)
      const hookAddress = this.getHookAddress(chainId)
      
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
      const wallet = new ethers.Wallet(config.evmPrivateKey, provider)
      const hookContract = new ethers.Contract(hookAddress, OmniCheckoutHookABI, wallet)

      // Validate percentage (max 10% = 1000 basis points)
      if (charityPercentage > 1000) {
        throw new Error('Charity percentage cannot exceed 10%')
      }

      const tx = await hookContract.updateCharityConfig(charityAddress, charityPercentage)
      const receipt = await tx.wait()

      logger.info('Updated charity config', {
        chainId,
        charityAddress,
        charityPercentage,
        transactionHash: tx.hash,
        gasUsed: receipt?.gasUsed?.toString()
      })

      return tx.hash
    } catch (error) {
      logger.error('Failed to update charity config', { 
        error, 
        chainId, 
        charityAddress, 
        charityPercentage 
      })
      throw error
    }
  }

  /**
   * Calculate charity amount for a given transfer amount
   */
  async calculateCharityAmount(
    chainId: SupportedChainId,
    amount: string
  ): Promise<{ charityAmount: string; recipientAmount: string }> {
    try {
      const chainConfig = getChainConfig(chainId)
      const hookAddress = this.getHookAddress(chainId)
      
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
      const hookContract = new ethers.Contract(hookAddress, OmniCheckoutHookABI, provider)

      const amountBigInt = ethers.parseUnits(amount, 6) // USDC has 6 decimals

      const [charityAmount, recipientAmount] = await hookContract.calculateCharityAmount(amountBigInt)

      const result = {
        charityAmount: ethers.formatUnits(charityAmount, 6),
        recipientAmount: ethers.formatUnits(recipientAmount, 6)
      }

      logger.info('Calculated charity amount', {
        chainId,
        inputAmount: amount,
        ...result
      })

      return result
    } catch (error) {
      logger.error('Failed to calculate charity amount', { error, chainId, amount })
      throw error
    }
  }

  /**
   * Execute hook manually (for testing purposes)
   */
  async executeHook(
    chainId: SupportedChainId,
    recipient: string,
    amount: string,
    messageHash: string
  ): Promise<HookExecution> {
    try {
      const chainConfig = getChainConfig(chainId)
      const hookAddress = this.getHookAddress(chainId)
      
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
      const wallet = new ethers.Wallet(config.evmPrivateKey, provider)
      const hookContract = new ethers.Contract(hookAddress, OmniCheckoutHookABI, wallet)

      const amountBigInt = ethers.parseUnits(amount, 6)
      const messageHashBytes = ethers.keccak256(ethers.toUtf8Bytes(messageHash))

      const tx = await hookContract.executeHook(recipient, amountBigInt, messageHashBytes)
      const receipt = await tx.wait()

      // Get charity config to return charity details
      const { charityAddress, charityPercentage } = await this.getCharityConfig(chainId)
      const charityAmountBigInt = (amountBigInt * BigInt(charityPercentage)) / 10000n
      const charityAmount = ethers.formatUnits(charityAmountBigInt, 6)

      const execution: HookExecution = {
        transactionHash: tx.hash,
        recipient,
        amount,
        charityAmount,
        charityAddress
      }

      logger.info('Hook executed successfully', {
        ...execution,
        gasUsed: receipt?.gasUsed?.toString(),
        blockNumber: receipt?.blockNumber
      })

      return execution
    } catch (error) {
      logger.error('Failed to execute hook', { 
        error, 
        chainId, 
        recipient, 
        amount, 
        messageHash 
      })
      throw error
    }
  }

  /**
   * Get hook contract owner
   */
  async getOwner(chainId: SupportedChainId): Promise<string> {
    try {
      const chainConfig = getChainConfig(chainId)
      const hookAddress = this.getHookAddress(chainId)
      
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
      const hookContract = new ethers.Contract(hookAddress, OmniCheckoutHookABI, provider)

      const owner = await hookContract.owner()

      logger.info('Retrieved hook owner', { chainId, owner })

      return owner
    } catch (error) {
      logger.error('Failed to get hook owner', { error, chainId })
      throw error
    }
  }

  /**
   * Check if contract is deployed on a specific chain
   */
  isDeployedOnChain(chainId: SupportedChainId): boolean {
    return !!DEPLOYED_HOOK_ADDRESSES[chainId]
  }

  /**
   * Get all deployed hook addresses
   */
  getDeployedAddresses(): Record<SupportedChainId, string> {
    return DEPLOYED_HOOK_ADDRESSES as Record<SupportedChainId, string>
  }

  /**
   * Update deployed address (for deployment scripts)
   */
  setDeployedAddress(chainId: SupportedChainId, address: string): void {
    DEPLOYED_HOOK_ADDRESSES[chainId] = address
    logger.info('Updated deployed address', { chainId, address })
  }

  /**
   * Health check for the hook service
   */
  async healthCheck(): Promise<{
    status: string
    deployedChains: SupportedChainId[]
    timestamp: string
  }> {
    const deployedChains = Object.keys(DEPLOYED_HOOK_ADDRESSES)
      .map(id => parseInt(id) as SupportedChainId)
      .filter(chainId => DEPLOYED_HOOK_ADDRESSES[chainId])

    return {
      status: 'healthy',
      deployedChains,
      timestamp: new Date().toISOString()
    }
  }
}

export default new OmniCheckoutHookService()
