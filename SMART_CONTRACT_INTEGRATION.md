# OmniCheckout Smart Contract Integration

This document explains how the OmniCheckout smart contracts are integrated with the backend API.

## Contract Overview

The `OmniCheckoutHook` contract is a Circle CCTP (Cross-Chain Transfer Protocol) message receiver that enables charity donations during cross-chain USDC transfers.

### Key Features

- **Charity Hook**: Automatically donate a percentage of transferred USDC to charity
- **CCTP Integration**: Receives cross-chain USDC transfers via Circle's protocol
- **Multi-chain Support**: Deployable on all CCTP-supported networks

## Backend Integration

### 1. Contract ABI

The contract ABI is stored in `/backend/src/abis/OmniCheckoutHook.json` and automatically loaded by the backend services.

### 2. Service Layer

- **File**: `src/services/omniCheckoutHookService.ts`
- **Purpose**: Handles contract interactions, encoding hook data, and managing deployed addresses
- **Key Methods**:
  - `encodeCharityHookData()`: Encodes charity recipient and percentage for CCTP
  - `setDeployedAddress()`: Updates deployed contract addresses per chain
  - `getDeployedAddress()`: Retrieves contract address for a specific chain

### 3. Controller Layer

- **File**: `src/controllers/omniCheckoutHookController.ts`
- **Purpose**: REST API endpoints for charity hook functionality
- **Endpoints**:
  - `POST /api/hooks/charity/encode`: Encode charity hook data
  - `GET /api/hooks/charity/validate`: Validate charity parameters

### 4. CCTP Integration

- **File**: `src/services/evmCCTPService.ts`
- **Purpose**: Automatically generates charity hook data for CCTP transfers
- **Behavior**: If OmniCheckoutHook is deployed on destination chain, includes charity logic in CCTP transfers

## API Usage

### Encode Charity Hook Data

```bash
curl -X POST http://localhost:3001/api/hooks/charity/encode \
  -H "Content-Type: application/json" \
  -d '{
    "charityAddress": "0x742d35Cc6C6C34B5b5c0532d3e9b2D9d3F8C5B8e",
    "charityPercentage": 5
  }'
```

### CCTP Transfer with Charity

```bash
curl -X POST http://localhost:3001/api/cctp/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100",
    "recipient": "0x...",
    "sourceChain": 11155111,
    "destinationChain": 84532,
    "charityAddress": "0x742d35Cc6C6C34B5b5c0532d3e9b2D9d3F8C5B8e",
    "charityPercentage": 5
  }'
```

## Deployment Process

### 1. Deploy Contracts

```bash
cd contracts
npm run deploy:sepolia  # or other networks
```

### 2. Update Backend Configuration

Edit `backend/src/utils/updateDeployedAddresses.ts`:

```typescript
const deployedAddresses: Partial<Record<SupportedChainId, string>> = {
  [SupportedChainId.ETH_SEPOLIA]: "0xYourDeployedAddress...",
  [SupportedChainId.BASE_SEPOLIA]: "0xYourDeployedAddress...",
  // Add more networks
};
```

### 3. Restart Backend

The backend will automatically load the new contract addresses on startup.

## Contract Functions

### Core Functions

- `receiveMessage()`: CCTP message receiver for cross-chain transfers
- `setCharityAddress()`: Update charity recipient (admin only)
- `setCharityPercentage()`: Update charity percentage (admin only)
- `emergencyWithdraw()`: Emergency fund recovery (admin only)

### Read Functions

- `charityAddress()`: Get current charity recipient
- `charityPercentage()`: Get current charity percentage
- `owner()`: Get contract owner

## Security Considerations

1. **Access Control**: Only contract owner can update charity parameters
2. **Emergency Functions**: Contract includes emergency withdrawal capabilities
3. **Input Validation**: All charity parameters are validated before use
4. **Reentrancy Protection**: Contract uses OpenZeppelin's security patterns

## Testing

### Run Contract Tests

```bash
cd contracts
npm test
```

### Backend Integration Tests

```bash
cd backend
npm run test:integration
```

## Supported Networks

| Network          | Chain ID | CCTP Support | Status |
| ---------------- | -------- | ------------ | ------ |
| Ethereum Sepolia | 11155111 | ✅           | Ready  |
| Base Sepolia     | 84532    | ✅           | Ready  |
| Arbitrum Sepolia | 421614   | ✅           | Ready  |
| Avalanche Fuji   | 43113    | ✅           | Ready  |
| Polygon Mumbai   | 80001    | ✅           | Ready  |

## Troubleshooting

### Common Issues

1. **Contract Not Found**: Ensure deployed address is set in `updateDeployedAddresses.ts`
2. **ABI Mismatch**: Re-extract ABI after contract updates
3. **Network Issues**: Verify RPC endpoints and chain IDs

### Debug Commands

```bash
# Check contract deployment
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>

# Test contract interaction
npx hardhat console --network sepolia
```

## Environment Variables

Add to your `.env` file:

```env
# Contract addresses (optional, can use updateDeployedAddresses.ts instead)
OMNICHECKOUT_HOOK_ETH_SEPOLIA=0x...
OMNICHECKOUT_HOOK_BASE_SEPOLIA=0x...

# RPC endpoints
ETH_SEPOLIA_RPC_URL=https://...
BASE_SEPOLIA_RPC_URL=https://...
```
