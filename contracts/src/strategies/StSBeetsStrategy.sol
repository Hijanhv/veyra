// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
// Removed unused imports (BaseStrategy already includes required guards)

import {BaseStrategy} from "../strategies/BaseStrategy.sol";
import {IStSAdapter} from "../interfaces/adapters/IStSAdapter.sol";
import {IBeetsAdapter} from "../interfaces/adapters/IBeetsAdapter.sol";
import {IStrategyIntrospection} from "../interfaces/IStrategyIntrospection.sol";

/// @title StSBeetsStrategy
/// @notice Strategy that converts S to stS and provides liquidity to BEETS.
///         Takes S from vault, converts half to stS, adds both to BEETS S/stS pool,
///         stakes the LP tokens for rewards. When withdrawing, unstakes LP, exits pool,
///         converts stS back to S and sends to vault. Can harvest BEETS rewards
contract StSBeetsStrategy is BaseStrategy, IStrategyIntrospection {
    using SafeERC20 for IERC20;

    /// @notice Adapter for converting S to stS tokens and back
    IStSAdapter public immutable STS;
    /// @notice Adapter for working with BEETS pools and gauges
    IBeetsAdapter public immutable BEETS;
    /// @notice BEETS pool where we provide S and stS liquidity
    address public immutable POOL;

    /// @notice stS token contract address from the adapter
    address public immutable STS_TOKEN;

    /// @notice How many LP tokens we have staked in the gauge
    uint256 public stakedLp;

    /// @param _sToken S token address (what the vault holds)
    /// @param _vault The vault contract address
    /// @param _stsAdapter Adapter for converting S to stS
    /// @param _beetsAdapter Adapter for BEETS pool operations
    /// @param _pool BEETS pool address for S/stS liquidity
    constructor(
        address _sToken,
        address _vault,
        address _stsAdapter,
        address _beetsAdapter,
        address _pool,
        string memory _name
    ) BaseStrategy(_sToken, _vault, _name) {
        require(
            _stsAdapter != address(0) && _beetsAdapter != address(0),
            "bad adapters"
        );
        require(_pool != address(0), "bad pool");
        STS = IStSAdapter(_stsAdapter);
        BEETS = IBeetsAdapter(_beetsAdapter);
        POOL = _pool;
        STS_TOKEN = STS.stSToken();

        // Let adapters spend our tokens
        IERC20(_sToken).approve(_stsAdapter, type(uint256).max);
        IERC20(STS_TOKEN).approve(_beetsAdapter, type(uint256).max);
        // Let staking adapter spend stS tokens when we unstake
        IERC20(STS_TOKEN).approve(_stsAdapter, type(uint256).max);
        IERC20(_sToken).approve(_beetsAdapter, type(uint256).max);
        // we'll approve LP token spending later when we first get some
    }

    /// @notice Deposit S tokens into the strategy. Converts half to stS,
    ///         adds both to BEETS pool, then stakes the LP tokens
    /// @param amount How much S to deposit
    function deposit(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero deposit");
        // check S balance (vault should have sent it already)
        uint256 sBal = ASSET.balanceOf(address(this));
        require(sBal >= amount, "insufficient funds");

        // Convert half to stS, keep half as S
        uint256 half = amount / 2;
        uint256 stSAmount = STS.stakeS(half);
        uint256 sAmount = amount - half;

        // Add liquidity to BEETS pool with slippage protection
        uint256 minLpOut = ((sAmount + stSAmount) * 95) / 100; // allow 5% slippage
        uint256 lpOut = BEETS.joinPool(
            POOL,
            address(ASSET),
            STS_TOKEN,
            sAmount,
            stSAmount,
            minLpOut
        );

        // Get gauge and approve LP token spending if we haven't yet
        address gauge = BEETS.getPoolGauge(POOL);
        address lpToken = BEETS.getPoolLpToken(POOL);
        if (IERC20(lpToken).allowance(address(this), address(BEETS)) == 0) {
            IERC20(lpToken).approve(address(BEETS), type(uint256).max);
        }

        // Stake the LP tokens to earn rewards
        BEETS.stakeInGauge(gauge, lpOut);
        stakedLp += lpOut;
    }

    /// @notice Withdraw S back to vault. If we don't have enough free S,
    ///         unstakes LP and exits BEETS pool. Converts any stS back to S.
    ///         Extra tokens stay in strategy for next time
    /// @param amount How much S to withdraw
    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero withdraw");
        uint256 freeS = ASSET.balanceOf(address(this));

        if (freeS < amount) {
            // Figure out how many LP tokens to unstake. For simplicity,
            // we unstake everything if needed
            uint256 lpBal = stakedLp;
            if (lpBal > 0) {
                address gauge = BEETS.getPoolGauge(POOL);
                BEETS.unstakeFromGauge(gauge, lpBal);
                stakedLp = 0;

                // Remove liquidity from the pool
                (, uint256 outStS) = BEETS.exitPool(
                    POOL,
                    lpBal,
                    address(ASSET),
                    STS_TOKEN,
                    0,
                    0
                );

                // Convert any stS we got back to S
                if (outStS > 0) {
                    STS.unstakeToS(outStS);
                }
            }
        }

        require(ASSET.balanceOf(address(this)) >= amount, "insufficient after exit");
        ASSET.safeTransfer(VAULT, amount);
    }

    /// @notice Collect rewards from BEETS gauge and keep them as free S.
    ///         Assumes rewards are S tokens or equivalent. If rewards are different
    ///         tokens, this function should be extended to swap them
    /// @return harvested How much rewards we collected
    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256 harvested)
    {
        address gauge = BEETS.getPoolGauge(POOL);
        harvested = BEETS.harvestRewards(gauge);
        // adapter transfers rewards to us automatically
    }

    /// @notice Calculate total value in S terms. This conservative version
    ///         only counts free S balance. Doesn't include LP or stS value since
    ///         that needs price oracles. Could be improved to include LP/stS valuation
    function totalAssets() public view override returns (uint256) {
        return ASSET.balanceOf(address(this));
    }

    /// @notice Get current yield percentage in basis points (1% = 100 bps)
    /// @dev Adapter returns APR scaled by 1e18. Convert to bps by / 1e14
    function apy() external view override returns (uint256) {
        return BEETS.getPoolApr(POOL) / 1e14;
    }

    /// @notice Return component list for off-chain introspection
    function components()
        external
        view
        override
        returns (address asset, uint8 schemaVersion, IStrategyIntrospection.Component[] memory comps)
    {
        asset = address(ASSET);
        schemaVersion = 1;
        comps = new IStrategyIntrospection.Component[](2);
        // StS
        comps[0] = IStrategyIntrospection.Component({
            kind: IStrategyIntrospection.ComponentKind.StS,
            adapter: address(STS),
            token0: address(0),
            token1: address(0),
            pool: address(0),
            gauge: address(0),
            extra: "",
            name: "StS"
        });
        // BEETS DEX
        comps[1] = IStrategyIntrospection.Component({
            kind: IStrategyIntrospection.ComponentKind.Dex,
            adapter: address(BEETS),
            token0: address(ASSET),
            token1: STS_TOKEN,
            pool: POOL,
            gauge: BEETS.getPoolGauge(POOL),
            extra: "",
            name: "Beets"
        });
    }
}
