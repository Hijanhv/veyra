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
- **IStSAdapter**: Interface for liquid staking token (stS) operations

## Architecture

Each strategy follows a standardized interface:
- `deposit(uint256 amount)`: Deploy funds into the strategy
- `withdraw(uint256 amount)`: Withdraw funds back to vault
- `harvest()`: Collect rewards and optimize positions
- `totalAssets()`: Calculate total value managed by strategy
- `apy()`: Get current yield percentage

### Introspection (for off-chain analytics)
- All strategies implement `IStrategyIntrospection.components()` which returns:
  - `asset` (base asset of the strategy)
  - `schemaVersion` (uint8)
  - `Component[]` with typed entries (Lending, Eggs, Rings, StS, Pendle, Dex, Custom)
- Off-chain services (server/) use this to discover adapters and fetch live metrics.

## Deployment Scripts

Pre-built deployment scripts for each strategy:
- `DeployAaveRingsCarryStrategy.s.sol`
- `DeployRingsAaveLoopStrategy.s.sol` 
- `DeployEggsShadowLoopStrategy.s.sol`
- `DeployStSBeetsStrategy.s.sol`
- `DeployPendleFixedYieldStSStrategy.s.sol`
- `DeploySwapXManagedRangeStrategy.s.sol`
- `DeployAllStrategies.s.sol` - Deploy all strategies at once

### Mock Deployment on Sonic
For a full mock setup on Sonic (mock tokens, mock adapters, per-asset vaults, and all strategies wired together), use:

```shell
# Set required env in contracts/.env or export in your shell
export PRIVATE_KEY=0x...
# optional: set a distinct strategy manager address
# export STRATEGY_MANAGER=0xYourEOA

cd contracts
forge script script/DeployMockSuite.s.sol:DeployMockSuite \
  --rpc-url sonic \
  --broadcast -vvvv
```

This deploys:
- Mock tokens: `S`, `stS`, `wS`, `USDC`
- Mock adapters for: StS, BEETS, SwapX, Rings, Lending, Pendle, Eggs, Shadow
- Four ERC-4626 vaults (one per base asset)
- All strategies wired to mocks and registered in their matching vaults

### One command: deploy and update addresses

Use the single helper to deploy and auto-update `contracts/DEPLOYED_ADDRESSES.md` and `server/.env`:

```bash
# From repo root
SONIC_RPC_URL=$SONIC_RPC_URL PRIVATE_KEY=0x... CHAIN_ID=146 node scripts/deploy-mock.mjs
```

It will:
- Run the Foundry mock deployment
- Append a “Latest Deployment” section (grouped by contract name) to `contracts/DEPLOYED_ADDRESSES.md`
- Update `server/.env` with `VAULT_ADDRESSES` (all deployed vaults), `DEFAULT_VAULT_ID` (first vault), and `CHAIN_ID`

Notes:
- The script loads env from `contracts/.env` and `server/.env` if present. It uses `SONIC_RPC_URL` for the RPC endpoint.

#### Optional: automatic Sonic FeeM registration

- Contracts include a `registerMe(uint256)` function (vaults + base strategies) that registers them with Sonic’s FeeM program.
- If you set `FEEM_PROJECT_ID` in your environment, the script post-calls `registerMe(projectId)` on every deployed vault and strategy using `cast`.

Example:

```bash
SONIC_RPC_URL=$SONIC_RPC_URL \
PRIVATE_KEY=0x... \
CHAIN_ID=146 \
FEEM_PROJECT_ID=123 \  # your FeeM project id
node scripts/deploy-mock.mjs
```

Troubleshooting:

- `Compiling... No files changed, compilation skipped`: expected when sources are unchanged; to force rebuild run `forge clean` in `contracts/`.
- `History restored`: informational from Foundry broadcast; new txs will still be broadcast.

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
