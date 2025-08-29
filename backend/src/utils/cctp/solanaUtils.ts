import { PublicKey } from '@solana/web3.js'
import { utils } from '@coral-xyz/anchor'

// Solana CCTP V2 Program IDs (Devnet)
export const SOLANA_MESSAGE_TRANSMITTER_PROGRAM_ID = new PublicKey('CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC')
export const SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID = new PublicKey('CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe')
export const SOLANA_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU') // Devnet USDC

/**
 * PDA derivation helpers for Solana CCTP
 */

export const deriveTokenMessengerPDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_messenger')],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

export const deriveRemoteTokenMessengerPDA = (remoteDomain: number): [PublicKey, number] => {
  const domainBuffer = Buffer.alloc(4)
  domainBuffer.writeUInt32BE(remoteDomain, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('remote_token_messenger'), domainBuffer],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

export const deriveTokenMinterPDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_minter')],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

export const deriveLocalTokenPDA = (mint: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('local_token'), mint.toBuffer()],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

export const deriveTokenPairPDA = (remoteDomain: number, remoteToken: PublicKey): [PublicKey, number] => {
  const domainBuffer = Buffer.alloc(4)
  domainBuffer.writeUInt32BE(remoteDomain, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_pair'), domainBuffer, remoteToken.toBuffer()],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

export const deriveCustodyTokenPDA = (mint: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('custody'), mint.toBuffer()],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

export const deriveEventAuthorityPDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('__event_authority')],
    SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM_ID
  )
}

/**
 * Generate proper instruction discriminator for Anchor programs
 */
export const getInstructionDiscriminator = (nameSpace: string, instructionName: string): Buffer => {
  const hash = utils.sha256.hash(`${nameSpace}:${instructionName}`)
  return Buffer.from(hash.slice(0, 8))
}

/**
 * Address conversion utilities
 */
export const solanaAddressToHex = (solanaAddress: string): string => {
  const pubkey = new PublicKey(solanaAddress)
  return '0x' + pubkey.toBuffer().toString('hex')
}

export const evmAddressToBytes32 = (address: string): string => {
  return `0x000000000000000000000000${address.replace('0x', '')}`
}

export const evmAddressToSolanaPublicKey = (addressHex: string): PublicKey => {
  const cleanHex = addressHex.replace('0x', '')
  const bytes = Buffer.from(cleanHex, 'hex')
  return new PublicKey(bytes)
}
