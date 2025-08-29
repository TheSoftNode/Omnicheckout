# OmniCheckout Smart Contracts

This directory contains the smart contracts for the OmniCheckout CCTP V2 hooks implementation.

## Contracts

### OmniCheckoutHook.sol

The main hook contract that implements charity donation functionality. When USDC is minted via CCTP V2, this hook automatically sends a configurable percentage to a charity address.

**Features:**

- Configurable charity percentage (up to 10%)
- Owner-controlled charity address updates
- Emergency withdrawal functionality
- Gas-efficient implementation
- Comprehensive event logging

### interfaces/ICCTP_V2.sol

Interface definitions for CCTP V2 contracts including:

- `ICCTP_V2_Hook`: Hook contract interface
- `ICCTP_V2_MessageTransmitter`: Message transmitter interface
- `ICCTP_V2_TokenMessenger`: Token messenger interface

## Deployment

The contracts are designed to be deployed on all CCTP V2 supported networks:

### Testnet Networks

- Ethereum Sepolia
- Arbitrum Sepolia
- Base Sepolia
- Avalanche Fuji
- Linea Sepolia
- Sonic Blaze
- World Chain Sepolia
- Optimism Sepolia
- Codex Testnet
- Unichain Sepolia
- Polygon Amoy
- Sei Testnet

## Hook Implementation

The CCTP V2 hook system allows for custom logic execution on the destination chain after USDC minting. Our implementation demonstrates:

1. **Charity Donations**: Automatically route a percentage of each payment to charity
2. **Transparent Operations**: All donations are logged via events
3. **Flexible Configuration**: Charity address and percentage can be updated
4. **Security**: Uses OpenZeppelin's battle-tested security patterns

## Usage

1. Deploy the `OmniCheckoutHook` contract on desired networks
2. Configure charity address and percentage
3. Include hook data in CCTP V2 `depositForBurn` calls
4. Hook executes automatically after minting on destination chain

## Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Ownable**: Access control for administrative functions
- **Input Validation**: Comprehensive parameter validation
- **Emergency Controls**: Emergency withdrawal functionality
- **Transfer Verification**: Checks for successful token transfers

## Gas Optimization

The contracts are optimized for gas efficiency:

- Minimal storage operations
- Efficient calculation methods
- Batch operations where possible
- Use of immutable variables for constants

## Events

The contracts emit comprehensive events for monitoring:

- `CharityDonationSent`: When charity donation is made
- `CharityConfigUpdated`: When charity settings change
- `HookExecuted`: When hook logic completes

## Testing

Comprehensive test suite covers:

- Happy path scenarios
- Edge cases and error conditions
- Gas usage optimization
- Security vulnerability testing
- Integration with CCTP V2 contracts

## Integration

The hooks integrate seamlessly with the OmniCheckout payment flow:

1. Customer initiates payment on source chain
2. CCTP V2 burns USDC with hook data
3. Circle's attestation service processes the message
4. USDC is minted on destination chain
5. Hook executes charity donation logic
6. Merchant receives payment minus charity percentage
7. Charity receives automatic donation

This demonstrates the power of CCTP V2 hooks for building advanced payment features on top of Circle's infrastructure.
