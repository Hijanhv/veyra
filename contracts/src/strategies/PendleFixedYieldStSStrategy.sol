// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import {BaseStrategy} from "../strategies/BaseStrategy.sol";
import {IPendleAdapter} from "../interfaces/adapters/IPendleAdapter.sol";
import {ILendingAdapter} from "../interfaces/adapters/ILendingAdapter.sol";
import {IStrategyIntrospection} from "../interfaces/IStrategyIntrospection.sol";

/// @title PendleFixedYieldStSStrategy
/// @notice Fixed-yield strategy using Pendle to sell future yield upfront.
///         Takes stS, splits into principal and yield tokens, sells yield tokens
///         for stable coins, deposits stable coins for extra yield. Holds principal
///         tokens until withdrawal. Converts everything back to stS when withdrawing
///
/// This strategy locks in fixed yield by selling future earnings upfront.
/// User deposits stS, Pendle splits it into principal and yield tokens,
/// yield tokens get sold immediately for stable coins (guaranteed income),
/// stable coins earn extra yield in lending protocol. When withdrawing,
/// redeem principal tokens and convert stable coins back to stS.
/// Result: more predictable returns than normal staking
contract PendleFixedYieldStSStrategy is BaseStrategy, IStrategyIntrospection {
    using SafeERC20 for IERC20;

    /// @notice Pendle adapter for splitting stS into principal/yield tokens,
    ///         selling yield tokens, and converting between stable coins and stS
    IPendleAdapter public immutable PENDLE;

    /// @notice Lending adapter to deposit stable coins and earn extra yield
    ///         on the money from selling yield tokens
    ILendingAdapter public immutable LENDING;

    /// @notice Stable coin address (like scUSD) we get from selling yield tokens.
    ///         The adapter tells us what stable coin to use
    address public immutable STABLE;

    /// @notice How many principal tokens we're holding. These tokens can be
    ///         redeemed for stS at maturity. We redeem them proportionally on withdrawals
    uint256 public ptBalance;

    /// @param _stS stS token address (what the vault holds)
    /// @param _vault The vault contract address
    /// @param _pendleAdapter Pendle protocol adapter address
    /// @param _lendingAdapter Lending adapter address for stable coin deposits
    constructor(
        address _stS,
        address _vault,
        address _pendleAdapter,
        address _lendingAdapter
    ) BaseStrategy(_stS, _vault) {
        require(
            _pendleAdapter != address(0) && _lendingAdapter != address(0),
            "bad adapters"
        );
        PENDLE = IPendleAdapter(_pendleAdapter);
        LENDING = ILendingAdapter(_lendingAdapter);
        STABLE = IPendleAdapter(_pendleAdapter).stableToken();
        // Let adapters spend our tokens
        IERC20(_stS).approve(_pendleAdapter, type(uint256).max);
        // Let Pendle adapter spend principal and yield tokens when needed
        address ptAddr = IPendleAdapter(_pendleAdapter).ptToken();
        address ytAddr = IPendleAdapter(_pendleAdapter).ytToken();
        if (ptAddr != address(0)) {
            IERC20(ptAddr).approve(_pendleAdapter, type(uint256).max);
        }
        if (ytAddr != address(0)) {
            IERC20(ytAddr).approve(_pendleAdapter, type(uint256).max);
        }
        // Let Pendle adapter spend stable coins when converting
        IERC20(STABLE).approve(_pendleAdapter, type(uint256).max);
        // Let lending adapter spend stable coins for deposits
        IERC20(STABLE).approve(_lendingAdapter, type(uint256).max);
    }

    /// @notice Deposit stS tokens into the strategy. Splits into principal/yield tokens,
    ///         sells yield tokens for stable coins, deposits stable coins for extra yield
    /// @param amount How much stS to deposit
    function deposit(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero deposit");
        uint256 stSBal = ASSET.balanceOf(address(this));
        require(stSBal >= amount, "insufficient funds");
        // Split stS into principal tokens (PT) and yield tokens (YT)
        (uint256 ptMinted, uint256 ytMinted) = PENDLE.splitAsset(amount);
        ptBalance += ptMinted;
        // Sell all yield tokens for stable coins
        uint256 stableReceived = PENDLE.sellYtForStable(ytMinted);
        // Put the stable coins into lending protocol to earn more yield
        if (stableReceived > 0) {
            LENDING.deposit(STABLE, stableReceived);
        }
    }

    /// @notice Withdraw stS back to vault. Uses free stS first, then redeems
    ///         principal tokens and converts stable coins back to stS as needed.
    ///         Leftover principal/stable coins stay invested
    /// @param amount How much stS to withdraw
    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero withdraw");
        uint256 free = ASSET.balanceOf(address(this));
        uint256 remaining = amount;
        // Use any free stS we have first
        if (free >= remaining) {
            // we have enough free stS
            ASSET.safeTransfer(VAULT, remaining);
            return;
        }
        // send all the free stS we have
        if (free > 0) {
            ASSET.safeTransfer(VAULT, free);
            remaining -= free;
        }
        // Figure out how much stable coins to convert. For simplicity,
        // we assume 1:1 exchange rate between stable coins and stS.
        // Real implementation would use price oracles
        uint256 stableBal = LENDING.collateralOf(address(this), STABLE);
        if (stableBal > 0 && remaining > 0) {
            uint256 stableToUse = stableBal > remaining ? remaining : stableBal;
            // take stable coins out of lending protocol
            LENDING.withdraw(STABLE, stableToUse);
            // convert stable coins back to stS
            uint256 underlyingOut = PENDLE.stableToUnderlying(stableToUse);
            remaining = remaining > underlyingOut
                ? remaining - underlyingOut
                : 0;
        }
        // redeem principal tokens if we still need more stS
        if (ptBalance > 0 && remaining > 0) {
            uint256 ptToRedeem = ptBalance > remaining ? remaining : ptBalance;
            uint256 redeemed = PENDLE.redeemPrincipal(ptToRedeem);
            ptBalance -= ptToRedeem;
            remaining = remaining > redeemed ? remaining - redeemed : 0;
        }
        require(remaining == 0, "insufficient liquidity");
        // send all the stS we gathered back to vault
        uint256 finalBal = ASSET.balanceOf(address(this));
        if (finalBal > 0) {
            ASSET.safeTransfer(VAULT, finalBal);
        }
    }

    /// @notice Collect yield from stable coin deposits. Withdraws stable coins
    ///         that have grown from lending yield, converts them to stS
    /// @return harvested How much stS we harvested
    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256 harvested)
    {
        // check how much stable coins we have in lending protocol
        uint256 stableBal = LENDING.collateralOf(address(this), STABLE);
        // for simplicity, treat all stable balance as harvestable.
        // withdraw everything and convert to stS
        if (stableBal > 0) {
            LENDING.withdraw(STABLE, stableBal);
            harvested = PENDLE.stableToUnderlying(stableBal);
            // send harvested stS back to vault
            if (harvested > 0) {
                ASSET.safeTransfer(VAULT, harvested);
            }
        }
    }

    /// @notice Calculate total value in stS terms. Includes free stS,
    ///         stable coin deposits (assuming 1:1 conversion), and principal tokens.
    ///         Real implementation would use price oracles for accurate pricing
    function totalAssets() public view override returns (uint256) {
        uint256 free = ASSET.balanceOf(address(this));
        uint256 stableBal = LENDING.collateralOf(address(this), STABLE);
        return free + stableBal + ptBalance;
    }

    /// @notice Get current yield percentage. Returns the lending yield on stable coins.
    ///         The fixed yield from Pendle is locked in at deposit time so not shown here
    function apy() external view override returns (uint256) {
        return LENDING.getSupplyApy(STABLE);
    }

    /// @notice Return component list for off-chain introspection
    function components()
        external
        view
        override
        returns (
            address asset,
            uint8 schemaVersion,
            IStrategyIntrospection.Component[] memory comps
        )
    {
        asset = address(ASSET);
        schemaVersion = 1;
        comps = new IStrategyIntrospection.Component[](2);
        // Pendle
        comps[0] = IStrategyIntrospection.Component({
            kind: IStrategyIntrospection.ComponentKind.Pendle,
            adapter: address(PENDLE),
            token0: address(0),
            token1: address(0),
            pool: address(0),
            gauge: address(0),
            extra: ""
        });
        // Lending on stable coin
        comps[1] = IStrategyIntrospection.Component({
            kind: IStrategyIntrospection.ComponentKind.Lending,
            adapter: address(LENDING),
            token0: STABLE, // supply token
            token1: address(0), // borrow token (none)
            pool: address(0),
            gauge: address(0),
            extra: ""
        });
    }
}
