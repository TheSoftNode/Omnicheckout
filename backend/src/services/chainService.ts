import { ethers } from 'ethers'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token'
import { ChainService, ChainInfo, BalanceInfo, TransactionStatus } from '../interfaces/chain.interface'
import { SupportedChainId } from '../types'
import { CHAIN_CONFIGS, getChainConfig, isSolanaChain } from '../config/chains'
import { createLogger } from '../utils/logger'

const logger = createLogger('ChainService')

export class ChainManagementService implements ChainService {
  async getSupportedChains(): Promise<Omit<ChainInfo, 'rpcUrl'>[]> {
    try {
      const chains = Object.values(CHAIN_CONFIGS).map(chain => ({
        chainId: chain.chainId,
        name: chain.name,
        nativeCurrency: chain.nativeCurrency,
        blockExplorerUrl: chain.blockExplorer,
        isTestnet: chain.isTestnet,
        destinationDomain: chain.destinationDomain,
        usdcAddress: chain.usdcAddress,
        tokenMessengerAddress: chain.tokenMessengerAddress,
        messageTransmitterAddress: chain.messageTransmitterAddress,
        tokenMinterAddress: chain.tokenMinterAddress,
        messageV2Address: chain.messageV2Address
      }))

      logger.info('Retrieved supported chains', { count: chains.length })
      return chains
    } catch (error) {
      logger.error('Failed to get supported chains', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw new Error('Failed to retrieve supported chains')
    }
  }

  async getChainInfo(chainId: SupportedChainId): Promise<Omit<ChainInfo, 'rpcUrl'>> {
    try {
      if (!this.validateChainSupport(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`)
      }

      const chainConfig = getChainConfig(chainId)
      
      const chainInfo = {
        chainId: chainConfig.chainId,
        name: chainConfig.name,
        nativeCurrency: chainConfig.nativeCurrency,
        blockExplorerUrl: chainConfig.blockExplorer,
        isTestnet: chainConfig.isTestnet,
        destinationDomain: chainConfig.destinationDomain,
        usdcAddress: chainConfig.usdcAddress,
        tokenMessengerAddress: chainConfig.tokenMessengerAddress,
        messageTransmitterAddress: chainConfig.messageTransmitterAddress,
        tokenMinterAddress: chainConfig.tokenMinterAddress,
        messageV2Address: chainConfig.messageV2Address
      }

      logger.info('Retrieved chain info', { chainId, name: chainInfo.name })
      return chainInfo
    } catch (error) {
      logger.error('Failed to get chain info', { 
        chainId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw error
    }
  }

  async getBalance(chainId: SupportedChainId, address: string): Promise<BalanceInfo> {
    try {
      if (!this.validateChainSupport(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`)
      }

      if (!this.validateAddress(chainId, address)) {
        throw new Error(`Invalid address format for chain ${chainId}: ${address}`)
      }

      const chainConfig = getChainConfig(chainId)
      let balance = '0'

      if (isSolanaChain(chainId)) {
        balance = await this.getSolanaBalance(chainConfig.rpcUrl, chainConfig.usdcAddress, address)
      } else {
        balance = await this.getEVMBalance(chainConfig.rpcUrl, chainConfig.usdcAddress, address)
      }

      const balanceInfo: BalanceInfo = {
        chainId,
        address,
        balance,
        symbol: 'USDC',
        decimals: 6,
        tokenAddress: chainConfig.usdcAddress
      }

      logger.info('Retrieved balance', { chainId, address, balance })
      return balanceInfo
    } catch (error) {
      logger.error('Failed to get balance', { 
        chainId, 
        address, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      
      // Return zero balance instead of throwing for better UX
      return {
        chainId,
        address,
        balance: '0',
        symbol: 'USDC',
        decimals: 6,
        tokenAddress: getChainConfig(chainId).usdcAddress
      }
    }
  }

  async getTransactionStatus(chainId: SupportedChainId, txHash: string): Promise<TransactionStatus> {
    try {
      if (!this.validateChainSupport(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`)
      }

      const chainConfig = getChainConfig(chainId)

      if (isSolanaChain(chainId)) {
        return await this.getSolanaTransactionStatus(chainConfig.rpcUrl, txHash, chainId)
      } else {
        return await this.getEVMTransactionStatus(chainConfig.rpcUrl, txHash, chainId)
      }
    } catch (error) {
      logger.error('Failed to get transaction status', { 
        chainId, 
        txHash, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      
      // Return pending status instead of throwing
      return {
        transactionHash: txHash,
        chainId,
        status: 'pending'
      }
    }
  }

  validateChainSupport(chainId: number): boolean {
    return Object.values(SupportedChainId).includes(chainId as SupportedChainId)
  }

  validateAddress(chainId: SupportedChainId, address: string): boolean {
    try {
      if (isSolanaChain(chainId)) {
        // Validate Solana address
        new PublicKey(address)
        return true
      } else {
        // Validate EVM address
        return ethers.isAddress(address)
      }
    } catch {
      return false
    }
  }

  private async getSolanaBalance(rpcUrl: string, usdcAddress: string, address: string): Promise<string> {
    try {
      const connection = new Connection(rpcUrl, 'confirmed')
      const walletPublicKey = new PublicKey(address)
      const usdcMint = new PublicKey(usdcAddress)
      
      const associatedTokenAddress = await getAssociatedTokenAddress(usdcMint, walletPublicKey)
      const tokenAccount = await getAccount(connection, associatedTokenAddress)
      
      // Convert from lamports to USDC (6 decimals)
      return (Number(tokenAccount.amount) / Math.pow(10, 6)).toString()
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        return '0'
      }
      throw error
    }
  }

  private async getEVMBalance(rpcUrl: string, usdcAddress: string, address: string): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const usdcContract = new ethers.Contract(
        usdcAddress,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      )
      
      const balanceWei = await usdcContract.balanceOf(address)
      return ethers.formatUnits(balanceWei, 6) // USDC has 6 decimals
    } catch (error) {
      logger.warn('Failed to fetch EVM balance', { rpcUrl, usdcAddress, address, error })
      return '0'
    }
  }

  private async getSolanaTransactionStatus(rpcUrl: string, txHash: string, chainId: SupportedChainId): Promise<TransactionStatus> {
    try {
      const connection = new Connection(rpcUrl, 'confirmed')
      const signature = await connection.getSignatureStatus(txHash)
      
      let status: 'pending' | 'confirmed' | 'failed' = 'pending'
      
      if (signature.value) {
        if (signature.value.err) {
          status = 'failed'
        } else if (signature.value.confirmationStatus === 'finalized' || signature.value.confirmationStatus === 'confirmed') {
          status = 'confirmed'
        }
      }

      return {
        transactionHash: txHash,
        chainId,
        status,
        confirmations: signature.value?.confirmations || 0
      }
    } catch (error) {
      logger.warn('Failed to get Solana transaction status', { txHash, error })
      return {
        transactionHash: txHash,
        chainId,
        status: 'pending'
      }
    }
  }

  private async getEVMTransactionStatus(rpcUrl: string, txHash: string, chainId: SupportedChainId): Promise<TransactionStatus> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const receipt = await provider.getTransactionReceipt(txHash)
      
      if (receipt) {
        const currentBlock = await provider.getBlockNumber()
        const confirmations = currentBlock - receipt.blockNumber
        
        return {
          transactionHash: txHash,
          chainId,
          status: receipt.status === 1 ? 'confirmed' : 'failed',
          blockNumber: receipt.blockNumber,
          confirmations,
          gasUsed: receipt.gasUsed.toString(),
          effectiveGasPrice: receipt.gasPrice?.toString(),
          timestamp: await this.getBlockTimestamp(provider, receipt.blockNumber)
        }
      } else {
        return {
          transactionHash: txHash,
          chainId,
          status: 'pending'
        }
      }
    } catch (error) {
      logger.warn('Failed to get EVM transaction status', { txHash, error })
      return {
        transactionHash: txHash,
        chainId,
        status: 'pending'
      }
    }
  }

  private async getBlockTimestamp(provider: ethers.JsonRpcProvider, blockNumber: number): Promise<number | undefined> {
    try {
      const block = await provider.getBlock(blockNumber)
      return block?.timestamp
    } catch (error) {
      logger.warn('Failed to get block timestamp', { blockNumber, error })
      return undefined
    }
  }
}
