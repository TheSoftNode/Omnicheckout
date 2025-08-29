import { ParsedMessage, ParsedDepositForBurn } from '../../interfaces/cctp.interface'

// CCTP Message structure constants
const MESSAGE_VERSION_OFFSET = 0
const SOURCE_DOMAIN_OFFSET = 4
const DESTINATION_DOMAIN_OFFSET = 8
const NONCE_OFFSET = 12
const SENDER_OFFSET = 20
const RECIPIENT_OFFSET = 52
const DESTINATION_CALLER_OFFSET = 84
const MESSAGE_BODY_OFFSET = 116

// Message body offsets for DepositForBurn
const MESSAGE_VERSION = 0
const BURN_TOKEN_OFFSET = 12
const MINT_RECIPIENT_OFFSET = 44
const AMOUNT_OFFSET = 76
const MESSAGE_SENDER_OFFSET = 84

/**
 * Parse a CCTP message hex string into structured data
 */
export const parseMessage = (messageHex: string): ParsedMessage => {
  const messageBuffer = Buffer.from(messageHex.startsWith('0x') ? messageHex.slice(2) : messageHex, 'hex')
  
  const version = messageBuffer.readUInt32BE(MESSAGE_VERSION_OFFSET)
  const sourceDomain = messageBuffer.readUInt32BE(SOURCE_DOMAIN_OFFSET)
  const destinationDomain = messageBuffer.readUInt32BE(DESTINATION_DOMAIN_OFFSET)
  const nonce = messageBuffer.readBigUInt64BE(NONCE_OFFSET)
  
  // Extract sender (32 bytes)
  const sender = messageBuffer.slice(SENDER_OFFSET, SENDER_OFFSET + 32)
  
  // Extract recipient (32 bytes) 
  const recipient = messageBuffer.slice(RECIPIENT_OFFSET, RECIPIENT_OFFSET + 32)
  
  // Extract destination caller (32 bytes)
  const destinationCaller = messageBuffer.slice(DESTINATION_CALLER_OFFSET, DESTINATION_CALLER_OFFSET + 32)
  
  // Extract message body
  const messageBody = messageBuffer.slice(MESSAGE_BODY_OFFSET)
  
  return {
    version,
    sourceDomain,
    destinationDomain,
    nonce,
    sender,
    recipient,
    destinationCaller,
    messageBody
  }
}

/**
 * Parse a DepositForBurn message body into structured data
 */
export const parseDepositForBurnMessage = (messageBodyBuffer: Buffer): ParsedDepositForBurn => {
  const messageBodyVersion = messageBodyBuffer.readUInt32BE(0)
  const burnToken = messageBodyBuffer.slice(BURN_TOKEN_OFFSET, BURN_TOKEN_OFFSET + 32)
  const mintRecipient = messageBodyBuffer.slice(MINT_RECIPIENT_OFFSET, MINT_RECIPIENT_OFFSET + 32)
  const amount = messageBodyBuffer.readBigUInt64BE(AMOUNT_OFFSET)
  const messageSender = messageBodyBuffer.slice(MESSAGE_SENDER_OFFSET, MESSAGE_SENDER_OFFSET + 32)
  
  return {
    messageBodyVersion,
    burnToken,
    mintRecipient,
    amount,
    messageSender
  }
}
