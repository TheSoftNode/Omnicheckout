# OmniCheckout Backend API

Backend API server for the OmniCheckout universal multichain USDC payment gateway.

## Features

- **CCTP V2 Integration**: Cross-chain USDC transfers using Circle's latest protocol
- **Multi-chain Support**: Supports all CCTP V2 enabled networks
- **Payment Sessions**: Secure payment session management
- **Webhook Handling**: Real-time transaction status updates
- **CCTP V2 Hooks**: Custom logic execution on destination chains
- **RESTful API**: Clean API endpoints for frontend integration

## Supported Networks

### Testnet Networks (Development)
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

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Circle API Configuration
CIRCLE_API_KEY=your_circle_api_key
CIRCLE_ENTITY_SECRET=your_circle_entity_secret

# Wallet Configuration
EVM_PRIVATE_KEY=your_evm_private_key
SOLANA_PRIVATE_KEY=your_solana_private_key

# CCTP Configuration
IRIS_API_URL=https://iris-api-sandbox.circle.com

# Database Configuration (if using)
DATABASE_URL=your_database_url

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret
```

## API Endpoints

### Payment Sessions
- `POST /api/payment/session` - Create payment session
- `GET /api/payment/session/:id` - Get payment session
- `PUT /api/payment/session/:id` - Update payment session

### CCTP Operations
- `POST /api/cctp/transfer` - Initiate cross-chain transfer
- `GET /api/cctp/status/:txHash` - Get transfer status
- `POST /api/cctp/attestation` - Get CCTP attestation

### Chain Information
- `GET /api/chains` - Get supported chains
- `GET /api/chains/:chainId/balance` - Get USDC balance

### Webhooks
- `POST /api/webhooks/circle` - Circle webhook endpoint

## Architecture

```
src/
├── controllers/     # Route handlers
├── services/        # Business logic
├── utils/          # Helper functions
├── types/          # TypeScript definitions
├── config/         # Configuration files
├── middleware/     # Express middleware
└── routes/         # API routes
```

## Development

### Code Style
- ESLint for linting
- Prettier for formatting
- TypeScript for type safety

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Formatting
```bash
npm run format
```

## Deployment

The backend can be deployed to any Node.js hosting platform:
- Vercel
- Railway
- Render
- Heroku
- AWS Lambda
- DigitalOcean App Platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
