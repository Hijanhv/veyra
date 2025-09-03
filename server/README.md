# Veyra AI-Powered Yield Optimization Server

A state-of-the-art Fastify server that provides AI-driven yield optimization for ERC-4626 vaults on Sonic blockchain. The server uses Claude Sonnet 4 to make intelligent investment allocation decisions across sophisticated DeFi strategies.

## 🚀 Features

- **AI-Powered Decision Making**: Uses Claude Sonnet 4 to analyze complex DeFi strategies and market conditions
- **Automated Rebalancing**: Scheduled rebalancing based on AI recommendations with confidence thresholds
- **Comprehensive Risk Analysis**: Multi-dimensional risk assessment including liquidation, protocol, and smart contract risks
- **Strategy Intelligence**: Understands and analyzes 6 different strategy types:
  - AaveRingsCarryStrategy (Carry trade with wS collateral)
  - EggsShadowLoopStrategy (Complex leveraged farming)
  - PendleFixedYieldStrategy (Fixed yield via future selling)
  - RingsAaveLoopStrategy (USDC->scUSD leveraged loops)
  - StSBeetsStrategy (Simple liquidity provision)
  - SwapXManagedRangeStrategy (Concentrated liquidity with ALM)
- **Real-time Monitoring**: Health checks and strategy analysis endpoints
- **Fallback Systems**: Graceful degradation when AI systems are unavailable

## 🛠 Architecture

### Services

1. **InvestmentAgent**: Core AI decision-making service that analyzes strategies and generates optimal allocations
2. **VaultService**: Blockchain interaction service for reading vault and strategy data
3. **RebalancingService**: Execution service for implementing AI recommendations on-chain
4. **SchedulerService**: Automated scheduling system for periodic rebalancing

### API Endpoints

#### Vault Operations
- `GET /api/vaults/:vaultId/metrics` - Get vault metrics and performance
- `GET /api/vaults/:vaultId/strategy` - Get AI allocation recommendations
- `GET /api/vaults/:vaultId/ai-rebalance` - Get detailed rebalancing analysis
- `POST /api/vaults/:vaultId/ai-rebalance` - Execute AI-driven rebalancing
- `GET /api/vaults/:vaultId/strategies/analysis` - Get detailed strategy analysis

#### System Management
- `GET /health` - Health check with AI and scheduler status
- `GET /admin/scheduler/status` - Get scheduler status
- `POST /admin/scheduler/start` - Start the scheduler
- `POST /admin/scheduler/stop` - Stop the scheduler

## 🔧 Setup

### Prerequisites

- Node.js 18+
- TypeScript
- Access to Sonic blockchain RPC
- Anthropic API key for Claude Sonnet 4

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
```env
SONIC_RPC_URL=https://rpc.soniclabs.com
ANTHROPIC_API_KEY=your_anthropic_api_key_here
STRATEGY_MANAGER_PRIVATE_KEY=your_private_key_here  # Optional, for automated rebalancing
VAULT_ADDRESSES=0x1234...,0x5678...  # Comma-separated vault addresses
ENABLE_AUTO_REBALANCING=true  # Enable automated rebalancing
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## 🤖 AI Decision Making

The AI system analyzes multiple factors for each strategy:

### Risk Factors
- **Liquidation Risk**: Health factor analysis and proximity to liquidation
- **Protocol Risk**: Borrowing cost analysis and protocol-specific risks
- **Smart Contract Risk**: Assessment based on protocol complexity
- **Impermanent Loss Risk**: For DEX-based strategies
- **Leverage Risk**: Analysis of leverage ratios and funding costs

### Strategy Complexity Scoring
- **EggsShadowLoopStrategy**: 0.9 (Very complex leveraged strategy)
- **AaveRingsCarryStrategy**: 0.7 (Complex carry trade)
- **PendleFixedYieldStrategy**: 0.6 (Medium complexity yield tokenization)
- **SwapXManagedRangeStrategy**: 0.5 (Automated range management)
- **StSBeetsStrategy**: 0.3 (Simple liquidity provision)

### Allocation Guidelines
1. Prioritize risk-adjusted returns over raw APY
2. Diversify across strategy types to reduce correlation risk
3. Limit exposure to high-leverage strategies (max 30% total)
4. Avoid strategies with health factors below 1.2
5. Balance complexity - max 40% in highly complex strategies
6. Consider protocol risks and smart contract maturity
7. Factor in current market conditions and volatility

## 📊 Strategy Analysis

The server automatically identifies and analyzes strategies based on their underlying protocols:

```typescript
// Example strategy analysis output
{
  "strategyAddress": "0x1234...",
  "strategyType": "AaveRingsCarryStrategy",
  "totalAssets": 1000.5,
  "apy": 850, // 8.5% in basis points
  "underlying": [
    {
      "name": "Lending",
      "supplyApy": 400,
      "borrowApy": 600,
      "healthFactor": 1.45
    },
    {
      "name": "Rings",
      "apr": 950
    }
  ],
  "riskFactors": {
    "liquidationRisk": 0.1,
    "protocolRisk": 0.2,
    "smartContractRisk": 0.3,
    "impermanentLossRisk": 0.0,
    "leverageRisk": 0.2
  },
  "complexityScore": 0.7
}
```

## 🔄 Automated Rebalancing

The scheduler runs every 6 hours and:

1. Analyzes all configured vaults
2. Generates AI recommendations
3. Executes rebalancing if:
   - AI confidence > 0.8
   - Allocation difference > 5%
   - Strategy manager wallet is configured

### Safety Features

- **Confidence Thresholds**: Only executes high-confidence recommendations
- **Fallback Systems**: Continues operating if AI is unavailable
- **Gas Management**: Reasonable gas limits for transactions
- **Error Handling**: Comprehensive error logging and recovery

## 🔐 Security Considerations

- Store private keys securely (use environment variables, not code)
- In production, add authentication for rebalancing endpoints
- Use proper CORS configuration
- Monitor gas costs and set appropriate limits
- Consider using multi-sig wallets for strategy manager role

## 📈 Monitoring

The server provides comprehensive monitoring:

```bash
# Check system health
curl http://localhost:8080/health

# Monitor vault performance
curl http://localhost:8080/api/vaults/0x1234.../metrics

# Get AI recommendations
curl http://localhost:8080/api/vaults/0x1234.../ai-rebalance
```

## 🐛 Troubleshooting

### AI Not Working
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check API key has sufficient credits
- Review error logs for API issues

### Rebalancing Not Executing
- Ensure `STRATEGY_MANAGER_PRIVATE_KEY` is set
- Verify the wallet has sufficient gas
- Check if wallet is authorized as strategy manager in vault contract

### Strategy Analysis Failing
- Verify `SONIC_RPC_URL` is accessible
- Check if vault contracts are deployed correctly
- Review strategy contract interfaces match expectations

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

Built with ❤️ for the future of DeFi yield optimization.