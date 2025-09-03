// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import {BaseStrategy} from "../strategies/BaseStrategy.sol";
import {IEggsAdapter} from "../interfaces/adapters/IEggsAdapter.sol";
import {IShadowAdapter} from "../interfaces/adapters/IShadowAdapter.sol";
import {IStSAdapter} from "../interfaces/adapters/IStSAdapter.sol";

/// @title EggsShadowLoopStrategy
/// @notice Leveraged yield farming strategy using Eggs Finance and Shadow Exchange.
/// Takes S tokens, mints EGGS (with fee), uses EGGS as collateral to borrow more S,
/// splits borrowed S into S and stS, provides liquidity to Shadow's S/stS pool,
/// and stakes the LP tokens for rewards. Can loop multiple times until reaching
/// target health factor for more leverage while managing risk
contract EggsShadowLoopStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IEggsAdapter public immutable EGGS;
    IShadowAdapter public immutable SHADOW;
    IStSAdapter public immutable STS;

    /// @notice The stS token contract address from the StS adapter
    address public immutable STS_TOKEN;
    /// @notice Shadow pool where we provide S/stS liquidity
    address public immutable POOL;
    /// @notice Gauge where we stake LP tokens to earn rewards
    address public immutable GAUGE;

    /// @notice How much to borrow as percentage of EGGS collateral
    uint256 public immutable BORROW_RATIO;
    /// @notice Target health factor - we stop leveraging when we reach this level
    uint256 public immutable TARGET_HF;
    /// @notice Max times we'll loop to add more leverage
    uint256 public immutable MAX_ITERATIONS;

    /// @notice How many LP tokens we have staked in the gauge
    uint256 public stakedLp;

    /// @param _sToken S token address (what the vault holds)
    /// @param _vault The vault contract address
    /// @param _eggsAdapter Eggs Finance adapter address
    /// @param _stSAdapter StS token adapter address
    /// @param _shadowAdapter Shadow Exchange adapter address
    /// @param _pool S/stS pool identifier on Shadow
    /// @param _gauge Gauge for staking LP tokens
    /// @param _borrowRatio Borrow percentage in basis points (0-10000)
    /// @param _targetHf Target health factor to maintain
    /// @param _maxIter Max leverage loops to perform
    constructor(
        address _sToken,
        address _vault,
        address _eggsAdapter,
        address _stSAdapter,
        address _shadowAdapter,
        address _pool,
        address _gauge,
        uint256 _borrowRatio,
        uint256 _targetHf,
        uint256 _maxIter
    ) BaseStrategy(_sToken, _vault) {
        require(
            _eggsAdapter != address(0) &&
                _shadowAdapter != address(0) &&
                _stSAdapter != address(0),
            "bad adapters"
        );
        require(_pool != address(0) && _gauge != address(0), "bad pool");
        require(_borrowRatio <= 10000, "bad ratio");
        require(_targetHf > 0, "bad HF");

        EGGS = IEggsAdapter(_eggsAdapter);
        SHADOW = IShadowAdapter(_shadowAdapter);
        STS = IStSAdapter(_stSAdapter);
        POOL = _pool;
        GAUGE = _gauge;
        BORROW_RATIO = _borrowRatio;
        TARGET_HF = _targetHf;
        MAX_ITERATIONS = _maxIter;

        STS_TOKEN = STS.stSToken();

        // Let adapters spend our tokens
        IERC20(_sToken).approve(_eggsAdapter, type(uint256).max);
        IERC20(_sToken).approve(_stSAdapter, type(uint256).max);
        IERC20(STS_TOKEN).approve(_stSAdapter, type(uint256).max);
        IERC20(STS_TOKEN).approve(_shadowAdapter, type(uint256).max);
        IERC20(_sToken).approve(_shadowAdapter, type(uint256).max);
        // Let Eggs adapter spend EGGS tokens when we redeem
        address eggsTok = IEggsAdapter(_eggsAdapter).eggsToken();
        if (eggsTok != address(0)) {
            IERC20(eggsTok).approve(_eggsAdapter, type(uint256).max);
        }
    }

    /// @notice Deposit S tokens and start the leveraged farming loop.
    /// Mints EGGS, borrows S, splits into S/stS, provides liquidity to Shadow,
    /// then repeats until health factor reaches target or max iterations
    /// @param amount How much S to deposit
    function deposit(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero deposit");
        uint256 sBal = ASSET.balanceOf(address(this));
        require(sBal >= amount, "insufficient S");

        // Convert S to EGGS tokens (Eggs keeps them as collateral and charges a fee)
        EGGS.mintEggs(amount);
        // EGGS tokens automatically become collateral in Eggs Finance

        // Figure out how much to borrow based on our EGGS collateral
        uint256 eggsColl = EGGS.collateralOf(address(this));
        uint256 borrowAmount = (eggsColl * BORROW_RATIO) / 10000;

        // Do the first leverage step
        if (borrowAmount > 0) {
            _borrowAndProvideLiquidity(borrowAmount);
        }

        // Keep looping until we hit target health factor or max loops
        for (uint256 i = 0; i < MAX_ITERATIONS; i++) {
            uint256 hf = EGGS.healthFactor(address(this));
            if (hf <= TARGET_HF) break;
            // Borrow 10% of EGGS collateral each loop
            uint256 stepBorrow = EGGS.collateralOf(address(this)) / 10;
            if (stepBorrow == 0) break;
            _borrowAndProvideLiquidity(stepBorrow);
        }
    }

    /// @dev Take borrowed S, convert half to stS, add liquidity to Shadow and stake
    /// @param sAmount How much S we just borrowed
    function _borrowAndProvideLiquidity(uint256 sAmount) internal {
        // Borrow S tokens from Eggs Finance
        EGGS.borrowS(sAmount);
        // Split the S - half stays S, half becomes stS
        uint256 half = sAmount / 2;
        uint256 stSAmount = STS.stakeS(half);
        uint256 sAmountRemaining = sAmount - half;
        // Provide liquidity to Shadow's S/stS pool
        uint256 minLpOut = ((sAmountRemaining + stSAmount) * 95) / 100; // allow 5% slippage
        uint256 lpOut = SHADOW.joinPool(
            POOL,
            address(ASSET),
            STS_TOKEN,
            sAmountRemaining,
            stSAmount,
            minLpOut
        );
        // Let Shadow adapter stake our LP tokens if not approved yet
        address lpToken = SHADOW.getPoolLpToken(POOL);
        if (IERC20(lpToken).allowance(address(this), address(SHADOW)) == 0) {
            IERC20(lpToken).approve(address(SHADOW), type(uint256).max);
        }
        // Stake the LP tokens to earn rewards
        SHADOW.stakeInGauge(GAUGE, lpOut);
        stakedLp += lpOut;
    }

    /// @notice Withdraw S tokens back to vault. Uses any free S first,
    /// then unwinds the whole leveraged position - unstakes LP, exits pool,
    /// repays debt, redeems EGGS back to S
    /// @param amount How much S to withdraw
    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero withdraw");
        uint256 freeS = ASSET.balanceOf(address(this));
        // If we don't have enough free S, unwind the leveraged position
        if (freeS < amount) {
            _unwindPosition();
        }
        // Convert EGGS collateral back to S
        uint256 eggsColl = EGGS.collateralOf(address(this));
        if (eggsColl > 0) {
            EGGS.redeemEggs(eggsColl);
        }
        // Pay back any remaining debt
        uint256 debt = EGGS.debtOf(address(this));
        uint256 repayAmount = debt;
        if (repayAmount > 0) {
            uint256 bal = ASSET.balanceOf(address(this));
            if (repayAmount > bal) repayAmount = bal;
            EGGS.repayS(repayAmount);
        }
        // Send the requested S back to vault
        uint256 available = ASSET.balanceOf(address(this));
        require(available >= amount, "insufficient after exit");
        ASSET.safeTransfer(VAULT, amount);
    }

    /// @dev Unwind the whole leveraged position - unstake LP, exit pool,
    /// convert stS back to S, repay debt and reset tracking
    function _unwindPosition() internal {
        // Remove LP tokens from staking if we have any
        uint256 lpBal = stakedLp;
        if (lpBal > 0) {
            SHADOW.unstakeFromGauge(GAUGE, lpBal);
            stakedLp = 0;
            // Remove liquidity from Shadow pool
            (, uint256 outStS) = SHADOW.exitPool(
                POOL,
                lpBal,
                address(ASSET),
                STS_TOKEN,
                0,
                0
            );
            // Convert stS tokens back to S
            if (outStS > 0) {
                STS.unstakeToS(outStS);
            }
        }
        // Pay back debt with whatever S we have
        uint256 debt = EGGS.debtOf(address(this));
        if (debt > 0) {
            uint256 bal = ASSET.balanceOf(address(this));
            uint256 repayAmt = bal > debt ? debt : bal;
            if (repayAmt > 0) {
                EGGS.repayS(repayAmt);
            }
        }
    }

    /// @notice Collect rewards from Shadow gauge. Rewards should be in S
    /// or convertible to S. Harvested rewards stay in the strategy as free S
    /// @return harvested How much rewards we collected
    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256 harvested)
    {
        harvested = SHADOW.harvestRewards(GAUGE);
    }

    /// @notice Calculate total value in S terms. Includes free S, EGGS collateral
    /// (valued 1:1), staked LP value, minus debt. Uses conservative pricing -
    /// stS and LP at face value. Could be improved with price oracles
    function totalAssets() public view override returns (uint256) {
        uint256 freeS = ASSET.balanceOf(address(this));
        uint256 eggsColl = EGGS.collateralOf(address(this));
        uint256 debt = EGGS.debtOf(address(this));
        // ignore staked LP and stS for conservative estimate
        uint256 total = freeS + eggsColl;
        return total > debt ? total - debt : 0;
    }

    /// @notice Calculate net yield percentage. Takes Eggs supply yield minus
    /// borrowing costs, plus Shadow pool rewards. Since LP pricing is complex,
    /// this uses simple math - Eggs net yield plus Shadow APR. Returns zero
    /// if net is negative
    function apy() external view override returns (uint256) {
        uint256 supplyApy = EGGS.getSupplyApy();
        uint256 borrowApy = EGGS.getBorrowApy();
        uint256 net = supplyApy > borrowApy ? supplyApy - borrowApy : 0;
        uint256 shadowApr = SHADOW.getPoolApr(POOL);
        // convert Shadow APR from 1e18 to basis points by dividing by 1e14
        uint256 shadowBp = shadowApr / 1e14;
        return net + shadowBp;
    }
}
