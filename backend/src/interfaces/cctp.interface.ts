import { SupportedChainId } from '../types'

export interface CCTPTransferParams {
  sourceConfig: ChainConfig
  destinationConfig: ChainConfig
  amount: bigint
  destinationAddress: string
  finalityThreshold: number
  maxFee: bigint
  hookData?: string
}

export interface CCTPCompletionParams {
  message: string
  attestation: string
  destinationConfig: ChainConfig
}

export interface ChainConfig {
  chainId: SupportedChainId
  rpcUrl: string
  destinationDomain: number
  tokenMessengerAddress: string
  messageTransmitterAddress: string
  usdcAddress: string
}

export interface ParsedMessage {
  version: number
  sourceDomain: number
  destinationDomain: number
  nonce: bigint
  sender: Buffer
  recipient: Buffer
  destinationCaller: Buffer
  messageBody: Buffer
}

export interface ParsedDepositForBurn {
  messageBodyVersion: number
  burnToken: Buffer
  mintRecipient: Buffer
  amount: bigint
  messageSender: Buffer
}

export interface CCTPService {
  executeTransfer(params: CCTPTransferParams): Promise<string>
  completeTransfer(params: CCTPCompletionParams): Promise<string>
}

export interface AttestationService {
  getAttestation(sourceChain: SupportedChainId, txHash: string): Promise<{
    status: 'pending' | 'complete'
    transactionHash: string
    attestation?: string
    message?: string
  }>
}

export interface StatusService {
  getTransferStatus(sourceChain: SupportedChainId, txHash: string): Promise<{
    transactionHash: string
    sourceChain: SupportedChainId
    transactionStatus: 'pending' | 'confirmed' | 'failed'
    confirmations: number
    attestationStatus: 'pending' | 'complete'
    canComplete: boolean
  }>
}
