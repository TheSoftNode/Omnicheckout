# OmniCheckout - Universal Multichain USDC Payment Gateway

**"One checkout, any chain. Let your customers pay with USDC from anywhere, and you get paid where you need it."**

OmniCheckout is a comprehensive CCTP V2-powered payment solution that enables merchants to accept USDC payments from any supported blockchain while receiving funds on their preferred chain. Built for Circle's Developer Bounties hackathon, it showcases the full potential of Cross-Chain Transfer Protocol V2 with advanced features like hooks and multi-network support.

## 🏆 Hackathon Submission

This project is submitted for Circle's **"Build a Multichain USDC Payment System"** challenge, implementing:

- ✅ **CCTP V2 Integration**: Full cross-chain USDC transfer capability
- ✅ **CCTP V2 Hooks**: Custom charity donation logic (bonus points!)
- ✅ **Multi-chain Support**: All 13 CCTP V2 supported networks
- ✅ **Real Business Value**: Universal merchant payment gateway
- ✅ **Production-Ready**: Complete frontend, backend, and smart contracts

## 🚀 Features

### For Merchants

- **Universal Payment Acceptance**: Accept USDC from any supported blockchain
- **Automatic Chain Rebalancing**: Receive payments on your preferred chain
- **Real-time Tracking**: Monitor payment status across the entire flow
- **Easy Integration**: Simple API and embeddable widget
- **Charity Integration**: Optional automatic charity donations via CCTP V2 hooks

### For Customers

- **Chain Flexibility**: Pay with USDC from your preferred network
- **Seamless Experience**: No manual bridging or complex workflows
- **Transparent Process**: Real-time updates throughout the payment
- **Wide Network Support**: 13+ supported blockchains

### Technical Excellence

- **CCTP V2 Native**: Built on Circle's latest cross-chain protocol
- **Advanced Hooks**: Demonstrates CCTP V2 hook capabilities
- **Production Architecture**: Scalable backend with proper error handling
- **Security First**: Comprehensive input validation and secure patterns
- **Gas Optimized**: Efficient smart contracts and transaction flows

## 🌐 Supported Networks

### Testnet (Current Implementation)

- Ethereum Sepolia
- Arbitrum Sepolia
- Base Sepolia
- Avalanche Fuji
- Linea Sepolia
- Sonic Blaze
- World Chain Sepolia
- Optimism Sepolia
- Solana Devnet
- Codex Testnet
- Unichain Sepolia
- Polygon Amoy
- Sei Testnet

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │ Smart Contracts │
│   (Next.js)     │◄──►│   (Node.js)      │◄──►│   (Solidity)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────▼────────┐             │
         │              │  CCTP V2 APIs   │             │
         │              │ (Circle's IRIS) │             │
         │              └─────────────────┘             │
         │                                              │
         └──────────────────┐    ┌──────────────────────┘
                            │    │
                     ┌──────▼────▼──────┐
                     │ CCTP V2 Protocol │
                     │ (Burn & Mint)    │
                     └──────────────────┘
```

### Components

1. **Frontend (Next.js)**

   - Merchant dashboard for configuration
   - Customer payment widget
   - Real-time transaction tracking
   - Chain selection interface

2. **Backend (Node.js)**

   - Payment session management
   - CCTP V2 transaction orchestration
   - Webhook handling for status updates
   - Multi-chain balance checking

3. **Smart Contracts (Solidity)**

   - CCTP V2 hook implementation
   - Charity donation automation
   - Security and access controls

4. **CCTP V2 Integration**
   - Cross-chain USDC transfers
   - Attestation management
   - Hook execution on destination chains

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Blockchain**: Ethers.js, Viem, Solana Web3.js
- **Smart Contracts**: Solidity, OpenZeppelin
- **APIs**: Circle CCTP V2 APIs, IRIS Attestation Service
- **Infrastructure**: CCTP V2 Protocol

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Circle Developer Account
- Testnet USDC tokens
- EVM and Solana private keys

### 1. Clone Repository

```bash
git clone https://github.com/your-username/omnicheckout.git
cd omnicheckout
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

### 4. Deploy Contracts (Optional)

```bash
cd ../contracts
# Deploy hook contracts to desired networks
```

### 5. Configure Environment

#### Backend (.env)

```env
CIRCLE_API_KEY=your_circle_api_key
CIRCLE_ENTITY_SECRET=your_circle_entity_secret
EVM_PRIVATE_KEY=your_evm_private_key
SOLANA_PRIVATE_KEY=your_solana_private_key
```

#### Frontend (.env.local)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

## 💡 Key Innovation: CCTP V2 Hooks

OmniCheckout showcases CCTP V2's most advanced feature - **hooks**. Our implementation automatically donates a configurable percentage of each payment to charity:

```solidity
function executeHook(
    address recipient,
    uint256 amount,
    bytes32 messageHash
) external {
    uint256 charityAmount = (amount * charityPercentage) / 10000;
    uint256 recipientAmount = amount - charityAmount;

    USDC.transfer(recipient, recipientAmount);
    USDC.transfer(charityAddress, charityAmount);

    emit CharityDonationSent(recipient, charityAddress, charityAmount, amount);
}
```

This demonstrates how CCTP V2 hooks enable powerful custom logic execution during cross-chain transfers.

## 📊 Demo Flow

1. **Merchant Setup**: Configure preferred payout chain (e.g., Ethereum)
2. **Customer Payment**: Customer chooses to pay from Avalanche
3. **CCTP V2 Burn**: USDC burned on Avalanche with hook data
4. **Attestation**: Circle's service attests to the burn
5. **Hook Execution**: Charity donation logic executes
6. **Merchant Receipt**: Merchant receives USDC on Ethereum
7. **Charity Donation**: Charity receives automatic donation

## 🎯 Business Impact

### For Merchants

- **Expanded Customer Base**: Accept payments from any CCTP V2 chain
- **Simplified Treasury**: Receive all payments on preferred chain
- **Reduced Friction**: No manual bridging required
- **Social Impact**: Built-in charity donations enhance brand image

### For Customers

- **Chain Freedom**: Pay from any supported network
- **Lower Costs**: No separate bridging transactions
- **Faster Payments**: Single-transaction cross-chain payments
- **Transparency**: Real-time status tracking

## 🔒 Security Features

- **Input Validation**: Comprehensive parameter checking
- **Rate Limiting**: API protection against abuse
- **Secure Key Management**: Environment-based configuration
- **Smart Contract Security**: OpenZeppelin security patterns
- **Error Handling**: Graceful failure management
- **Audit Trail**: Comprehensive logging and events

## 📈 Scalability & Production

### Performance Optimizations

- **Gas Efficiency**: Optimized smart contract operations
- **API Caching**: Intelligent balance and status caching
- **Batch Processing**: Efficient multi-transaction handling
- **Connection Pooling**: Optimized RPC connections

### Production Considerations

- **Database Integration**: Easy switch from in-memory to persistent storage
- **Monitoring**: Comprehensive logging and metrics
- **Error Recovery**: Automatic retry mechanisms
- **Webhook Reliability**: Robust webhook processing
- **Multi-region Deployment**: Scalable infrastructure support

## 🎨 UI/UX Excellence

### Merchant Dashboard

- **Clean Interface**: Intuitive payment session management
- **Real-time Updates**: Live transaction status tracking
- **Chain Analytics**: Payment distribution across networks
- **Configuration Panel**: Easy charity and payout settings

### Customer Widget

- **Embedded Integration**: Easy website integration
- **Chain Selection**: Visual blockchain picker
- **Progress Tracking**: Step-by-step payment flow
- **Mobile Responsive**: Seamless mobile experience

## 🏆 Competitive Advantages

1. **First-to-Market**: Early CCTP V2 hooks implementation
2. **Complete Solution**: End-to-end payment infrastructure
3. **Developer-Friendly**: Easy integration APIs
4. **Business-Ready**: Real-world merchant applications
5. **Social Impact**: Built-in charity donation features
6. **Network Agnostic**: Supports all CCTP V2 chains
7. **Future-Proof**: Built on Circle's latest technology

## 📱 Integration Examples

### E-commerce Plugin

```javascript
<OmniCheckout
  merchantId="merchant_123"
  amount="100.00"
  preferredChain="ethereum"
  onSuccess={(payment) => console.log("Payment completed", payment)}
/>
```

### API Integration

```javascript
const session = await fetch("/api/payment/session", {
  method: "POST",
  body: JSON.stringify({
    merchantId: "merchant_123",
    amount: "100.00",
    preferredChain: 1, // Ethereum
  }),
});
```

## 🔮 Future Roadmap

### Phase 1: Core Features ✅

- CCTP V2 integration
- Multi-chain support
- Basic hooks implementation

### Phase 2: Advanced Features 🚧

- Gasless transactions with Circle Paymaster
- Advanced hook patterns
- Mobile SDK

### Phase 3: Enterprise 📋

- Multi-merchant platform
- Advanced analytics
- White-label solutions

## 📄 Documentation

- [Backend API Documentation](./backend/README.md)
- [Frontend Setup Guide](./frontend/README.md)
- [Smart Contract Documentation](./contracts/README.md)
- [CCTP V2 Integration Guide](./docs/CCTP_V2_INTEGRATION.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📞 Support

- **Discord**: [Circle Developer Community](https://discord.gg/buildoncircle)
- **Email**: team@omnicheckout.dev
- **Documentation**: [Circle Developers](https://developers.circle.com)

## 📜 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **Circle Team**: For building the amazing CCTP V2 infrastructure
- **Community**: For feedback and testing
- **Open Source**: Standing on the shoulders of giants

---

**Built with ❤️ for Circle's Developer Bounties Hackathon**

_OmniCheckout demonstrates the true power of CCTP V2 - enabling seamless, cross-chain commerce that makes blockchain boundaries invisible to end users._
