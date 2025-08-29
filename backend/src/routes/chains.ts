import { Router } from 'express'
import { ethers } from 'ethers'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import { CHAIN_CONFIGS, getChainConfig, isSolanaChain } from '../config/chains'
import { ApiResponse, BalanceResponse, SupportedChainId } from '../types'
import { createLogger } from '../utils/logger'

const router = Router()
const logger = createLogger('ChainRoutes')

// Get supported chains
router.get('/', async (req, res, next) => {
  try {
    const chains = Object.values(CHAIN_CONFIGS).map(chain => ({
      chainId: chain.chainId,
      name: chain.name,
      nativeCurrency: chain.nativeCurrency,
      isTestnet: chain.isTestnet,
      usdcAddress: chain.usdcAddress,
      destinationDomain: chain.destinationDomain
    }))

    const response: ApiResponse<typeof chains> = {
      success: true,
      data: chains,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

// Get chain information
router.get('/:chainId', async (req, res, next) => {
  try {
    const chainId = parseInt(req.params.chainId, 10)
    
    if (!Object.values(SupportedChainId).includes(chainId)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported chain ID: ${chainId}`,
        timestamp: new Date().toISOString()
      })
    }

    const chainConfig = getChainConfig(chainId)

    const response: ApiResponse<typeof chainConfig> = {
      success: true,
      data: chainConfig,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

// Get USDC balance for an address on a specific chain
router.get('/:chainId/balance/:address', async (req, res, next) => {
  try {
    const chainId = parseInt(req.params.chainId, 10)
    const { address } = req.params

    if (!Object.values(SupportedChainId).includes(chainId)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported chain ID: ${chainId}`,
        timestamp: new Date().toISOString()
      })
    }

    const chainConfig = getChainConfig(chainId)
    let balance = '0'

    try {
      if (isSolanaChain(chainId)) {
        // Solana balance check
        const connection = new Connection(chainConfig.rpcUrl, 'confirmed')
        const walletPublicKey = new PublicKey(address)
        const usdcMint = new PublicKey(chainConfig.usdcAddress)
        
        try {
          const associatedTokenAddress = await getAssociatedTokenAddress(
            usdcMint,
            walletPublicKey
          )
          const tokenAccount = await getAccount(connection, associatedTokenAddress)
          balance = (Number(tokenAccount.amount) / Math.pow(10, 6)).toString()
        } catch (tokenError) {
          // Token account doesn't exist, balance is 0
          balance = '0'
        }
      } else {
        // EVM balance check
        const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
        const usdcContract = new ethers.Contract(
          chainConfig.usdcAddress,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        )
        
        const balanceWei = await usdcContract.balanceOf(address)
        balance = ethers.formatUnits(balanceWei, 6) // USDC has 6 decimals
      }
    } catch (balanceError) {
      logger.warn('Failed to fetch balance', { 
        chainId, 
        address, 
        error: balanceError instanceof Error ? balanceError.message : 'Unknown error' 
      })
      // Return 0 balance if we can't fetch it
      balance = '0'
    }

    const balanceResponse: BalanceResponse = {
      chainId,
      address,
      balance,
      symbol: 'USDC',
      decimals: 6
    }

    const response: ApiResponse<BalanceResponse> = {
      success: true,
      data: balanceResponse,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

// Get transaction status
router.get('/:chainId/transaction/:txHash', async (req, res, next) => {
  try {
    const chainId = parseInt(req.params.chainId, 10)
    const { txHash } = req.params

    if (!Object.values(SupportedChainId).includes(chainId)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported chain ID: ${chainId}`,
        timestamp: new Date().toISOString()
      })
    }

    const chainConfig = getChainConfig(chainId)
    let transactionStatus

    try {
      if (isSolanaChain(chainId)) {
        // Solana transaction status
        const connection = new Connection(chainConfig.rpcUrl, 'confirmed')
        const signature = await connection.getSignatureStatus(txHash)
        
        transactionStatus = {
          transactionHash: txHash,
          chainId,
          status: signature.value?.confirmationStatus || 'pending',
          confirmations: signature.value?.confirmations || 0
        }
      } else {
        // EVM transaction status
        const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
        const receipt = await provider.getTransactionReceipt(txHash)
        
        if (receipt) {
          const currentBlock = await provider.getBlockNumber()
          const confirmations = currentBlock - receipt.blockNumber
          
          transactionStatus = {
            transactionHash: txHash,
            chainId,
            status: receipt.status === 1 ? 'confirmed' : 'failed',
            blockNumber: receipt.blockNumber,
            confirmations,
            gasUsed: receipt.gasUsed.toString(),
            effectiveGasPrice: receipt.gasPrice?.toString()
          }
        } else {
          transactionStatus = {
            transactionHash: txHash,
            chainId,
            status: 'pending'
          }
        }
      }
    } catch (txError) {
      logger.warn('Failed to fetch transaction status', { 
        chainId, 
        txHash, 
        error: txError instanceof Error ? txError.message : 'Unknown error' 
      })
      
      transactionStatus = {
        transactionHash: txHash,
        chainId,
        status: 'pending'
      }
    }

    const response: ApiResponse<typeof transactionStatus> = {
      success: true,
      data: transactionStatus,
      timestamp: new Date().toISOString()
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})

export { router as chainRoutes }
