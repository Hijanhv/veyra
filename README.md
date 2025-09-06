# Veyra Protocol

AI-powered yield strategies on Sonic. Vaults allocate capital across modular strategy components (lending, DEX, staking, etc.), and off-chain services read a unified components-based introspection to report metrics.

## Features
- ERC-4626 vaults with multiple strategies
- Components-based strategy introspection (`components()`)
- Sonic integrations: Aave (lending), Rings, Eggs, Shadow, BEETS, SwapX, Pendle
- Optional analytics/indexing and rebalancing services

## 🏗️ Architecture

### Backend (`/server`)
- Fastify TypeScript API
- Reads `IStrategyIntrospection.components()` and queries adapters for metrics
- Optional analytics and rebalancing services

### Smart Contracts (`/contracts`)
- VeyraVault: ERC-4626 vault with strategy management
- Strategies implementing `IStrategyIntrospection.components()`
- Adapter interfaces for lending/DEX/staking protocols

### Frontend (`/web`)
- **Next.js** React application with modern UI/UX
- **RainbowKit** wallet integration for Sonic network
- **Real-time Dashboard**: Live yield tracking, portfolio metrics, and analytics
- **Strategy Insights**: AI-generated market insights and recommendations

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Foundry for smart contract development
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd veyra
   ```

2. **Install Backend Dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../web
   npm install
   ```

4. **Install Smart Contract Dependencies**
   ```bash
   cd ../contracts
   forge install
   # This installs dependencies locally to contracts/lib/
   # All dependencies are self-contained within the contracts/ directory
   ```

### Environment Setup

1. Backend env (`server/.env`)
   ```env
   PORT=8080
   FRONTEND_URL=http://localhost:3000
   SONIC_RPC_URL=wss://sonic-rpc.publicnode.com
   ```

2. Frontend env (`web/.env.local`)
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

3. Contracts env (`contracts/.env`)
   ```env
   SONIC_RPC_URL=wss://sonic-rpc.publicnode.com
   PRIVATE_KEY=your_private_key_here
   ```

### Development

1. **Start Backend Server**
   ```bash
   cd server
   npm run dev
   ```

2. **Start Frontend Development Server**
   ```bash
   cd web
   npm run dev
   ```

3. **Compile Smart Contracts**
   ```bash
   cd contracts
   forge build
   ```

4. **Run Tests**
   ```bash
   # Backend tests
   cd server && npm test
   
   # Contract tests
   cd contracts && forge test
   
   # Frontend tests
   cd web && npm test
   ```

### Deployment
- Contracts: see `contracts/README.md` (includes a one-command deploy + address update helper)
- Server: `npm run build && npm start`
- Web: `npm run build && npm start`

## Supported Protocols (Sonic)
- Lending: Aave (via adapter)
- DEX: Shadow, BEETS, SwapX
- Yield/Derivatives: Rings, Eggs, Pendle

## 📊 API Endpoints

### Protocol Data
- `GET /api/protocols/opportunities` - Get all yield opportunities
- `GET /api/protocols/{protocol}` - Get specific protocol data

### Vault Management
- `GET /api/vaults/{vaultId}/metrics` - Vault performance metrics
- `GET /api/vaults/{vaultId}/strategy` - AI strategy recommendations

### Analytics
- `GET /api/analytics/insights` - Market insights and trends
- `GET /api/analytics/predictions` - Yield predictions

## 🔒 Security

- **Smart Contract Audits**: All contracts undergo thorough security reviews
- **Multi-signature Controls**: Critical functions require multiple approvals
- **Emergency Pause**: Circuit breaker for emergency situations
- **Risk Assessment**: Continuous monitoring of protocol and market risks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌐 Links

- **Website**: [Coming Soon]
- **Documentation**: [Coming Soon]

## ⚠️ Disclaimer

Veyra Protocol is experimental software. Use at your own risk. DeFi investments carry inherent risks including smart contract vulnerabilities, market volatility, and potential loss of funds. Always do your own research and never invest more than you can afford to lose.

---

**Built with ❤️ for the Sonic ecosystem**
