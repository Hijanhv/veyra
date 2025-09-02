# Veyra Protocol Smart Contracts

This directory contains the smart contracts for Veyra Protocol - an AI-driven yield optimization platform built on Sonic. Veyra Protocol provides advanced DeFi strategies that automatically maximize yield while managing risk through intelligent position management.

## Overview

Veyra Protocol consists of various yield farming strategies that interact with major DeFi protocols on Sonic including Aave, Rings, Eggs Finance, Shadow Exchange, BEETS, SwapX, and Pendle. Each strategy is designed to optimize returns while maintaining appropriate risk levels.

## Strategies

### 🏦 Lending & Carry Strategies
- **AaveRingsCarryStrategy**: Uses Aave lending with Rings yield farming for carry trades
- **RingsAaveLoopStrategy**: Leveraged loop strategy using Rings and Aave protocols

### 🔄 Leveraged Loop Strategies  
- **EggsShadowLoopStrategy**: Complex leveraged farming using Eggs Finance and Shadow Exchange
- **StSBeetsStrategy**: Liquid staking strategy using stS tokens and BEETS pools

### 🎯 Specialized Strategies
- **PendleFixedYieldStSStrategy**: Fixed yield strategy using Pendle's principal/yield token splitting
- **SwapXManagedRangeStrategy**: Concentrated liquidity strategy with automatic range management on SwapX

### 📋 Base Infrastructure
- **BaseStrategy**: Core strategy contract that all strategies inherit from

## Protocol Adapters

The contracts use adapter interfaces to interact with external DeFi protocols:

- **ILendingAdapter**: Interface for Aave and other lending protocols
- **IRingsAdapter**: Interface for Rings protocol interactions
- **IEggsAdapter**: Interface for Eggs Finance leveraged positions
- **IShadowAdapter**: Interface for Shadow Exchange concentrated liquidity
- **IBeetsAdapter**: Interface for BEETS liquidity pools and staking
- **ISwapXAdapter**: Interface for SwapX DEX and gauge rewards
- **IPendleAdapter**: Interface for Pendle yield tokenization

## Architecture

Each strategy follows a standardized interface:
- `deposit(uint256 amount)`: Deploy funds into the strategy
- `withdraw(uint256 amount)`: Withdraw funds back to vault
- `harvest()`: Collect rewards and optimize positions
- `totalAssets()`: Calculate total value managed by strategy
- `apy()`: Get current yield percentage

## Deployment Scripts

Pre-built deployment scripts for each strategy:
- `DeployAaveRingsCarryStrategy.s.sol`
- `DeployRingsAaveLoopStrategy.s.sol` 
- `DeployEggsShadowLoopStrategy.s.sol`
- `DeployStSBeetsStrategy.s.sol`
- `DeployPendleFixedYieldStSStrategy.s.sol`
- `DeploySwapXManagedRangeStrategy.s.sol`
- `DeployAllStrategies.s.sol` - Deploy all strategies at once

## Testing

Comprehensive test suite with mock contracts for each protocol:
- Full strategy lifecycle testing (deposit, harvest, withdraw)
- Mock adapters that simulate real protocol behavior
- Edge case testing for liquidation scenarios
- Gas optimization testing

## Development Setup

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js (for additional tooling)

### Build
```shell
forge build
```

### Test
```shell
forge test
```

### Format Code
```shell
forge fmt
```

### Gas Analysis
```shell
forge snapshot
```

### Local Development
```shell
anvil
```

### Deploy Strategies
```shell
# Deploy single strategy
forge script script/DeployAaveRingsCarryStrategy.s.sol --rpc-url <your_rpc_url> --private-key <your_private_key>

# Deploy all strategies
forge script script/DeployAllStrategies.s.sol --rpc-url <your_rpc_url> --private-key <your_private_key>
```

## Risk Management

All strategies implement multiple risk management features:
- Health factor monitoring for leveraged positions
- Slippage protection on DEX operations
- Reentrancy guards on all external calls
- Safe token transfer implementations
- Maximum leverage limits

## Security

- All contracts inherit from OpenZeppelin's security modules
- Comprehensive test coverage with edge case scenarios
- Reentrancy protection on all user-facing functions
- Input validation and proper error handling
- Mock contracts for safe testing of protocol integrations

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add comprehensive tests for new strategies
4. Ensure all tests pass: `forge test`
5. Format code: `forge fmt`
6. Submit a pull request

## License

MIT License - see LICENSE file for details

---

Built with ❤️ by the Veyra team for the Sonic ecosystem