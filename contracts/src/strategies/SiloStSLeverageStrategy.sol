// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseStrategy.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStSAdapter} from "../interfaces/adapters/IStSAdapter.sol";
import {ISiloAdapter} from "../interfaces/adapters/ISiloAdapter.sol";

contract SiloStSLeverageStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IStSAdapter public immutable sts;
    ISiloAdapter public immutable silo;

    // config
    uint256 public targetHF; // e.g., 1.5e18
    uint256 public minHF; // e.g., 1.3e18 guardrail
    uint256 public maxIterations; // loop cap

    event LoopExecuted(uint256 iterations, uint256 finalHF);
    event UnwindExecuted(uint256 repaid, uint256 hfAfter);

    constructor(
        address _assetS,
        address _vault,
        address _stsAdapter,
        address _siloAdapter,
        uint256 _targetHF,
        uint256 _minHF,
        uint256 _maxIter
    ) BaseStrategy(_assetS, _vault) {
        sts = IStSAdapter(_stsAdapter);
        silo = ISiloAdapter(_siloAdapter);
        require(_targetHF > _minHF, "bad HF");
        targetHF = _targetHF;
        minHF = _minHF;
        maxIterations = _maxIter;
        IERC20(_assetS).approve(_stsAdapter, type(uint256).max);
        IERC20(sts.stSToken()).approve(_siloAdapter, type(uint256).max);
        IERC20(_assetS).approve(_siloAdapter, type(uint256).max);
    }

    /// @notice deposit S (already transferred by vault) and run leverage loop
    function deposit(uint256 amount) external override onlyVault nonReentrant {
        // stake S -> stS
        uint256 stS = sts.stakeS(amount);
        // deposit stS as collateral
        silo.depositCollateral(sts.stSToken(), stS);

        uint256 it;
        while (it < maxIterations && silo.healthFactor(address(this)) > 0) {
            // stop if already above target
            uint256 hf = silo.healthFactor(address(this));
            if (hf <= targetHF) break;

            // borrow some S sized by how far we are from targetHF
            uint256 borrowS = _borrowStep(hf);
            if (borrowS == 0) break;

            silo.borrow(sts.sToken(), borrowS);
            // stake borrowed S -> stS and deposit as more collateral
            uint256 moreStS = sts.stakeS(borrowS);
            silo.depositCollateral(sts.stSToken(), moreStS);
            it++;
        }
        emit LoopExecuted(it, silo.healthFactor(address(this)));
    }

    /// @notice withdraw exact S for the vault; will repay debt if needed and unwrap stS
    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        // try to use free S first
        uint256 sBal = IERC20(sts.sToken()).balanceOf(address(this));
        if (sBal >= amount) {
            IERC20(sts.sToken()).safeTransfer(vault, amount);
            return;
        }

        uint256 need = amount - sBal;

        // repay debt first if any (convert stS -> S to repay)
        uint256 currentDebt = silo.debtOf(address(this), sts.sToken());
        if (currentDebt > 0) {
            // take a chunk of stS collateral out, unwrap to S, repay
            uint256 repayS = need > currentDebt ? currentDebt : need;
            // pull stS out
            uint256 stSOut = _withdrawStSCollateralForS(repayS);
            uint256 sFromUnstake = sts.unstakeToS(stSOut);
            silo.repay(
                sts.sToken(),
                sFromUnstake > repayS ? repayS : sFromUnstake
            );
        }

        // now withdraw more stS collateral, unwrap to S to satisfy requested amount
        uint256 stillNeed = amount -
            IERC20(sts.sToken()).balanceOf(address(this));
        if (stillNeed > 0) {
            uint256 stSMore = _withdrawStSCollateralForS(stillNeed);
            uint256 sMore = sts.unstakeToS(stSMore);
            // top-up any small diff
            if (sMore < stillNeed) revert("insufficient unwind");
        }

        IERC20(sts.sToken()).safeTransfer(vault, amount);
        emit UnwindExecuted(currentDebt, silo.healthFactor(address(this)));
    }

    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256)
    {
        // stS auto-accrues; if Silo incentives exist, claim in adapter and convert to S
        // stub: adapters can transfer S to this contract; nothing to do here
        return 0;
    }

    function totalAssets() external view override returns (uint256) {
        // rough: free S + (stS collateral valued in S) - debt
        uint256 sFree = IERC20(sts.sToken()).balanceOf(address(this));
        uint256 stSCol = silo.collateralOf(address(this), sts.stSToken());
        uint256 sFromStS = (stSCol * 1e18) / (sts.rate()); // convert stS -> S using rate
        uint256 debt = silo.debtOf(address(this), sts.sToken());
        return sFree + sFromStS > debt ? sFree + sFromStS - debt : 0;
    }

    function apy() external pure override returns (uint256) {
        // adapter can expose current blended APY; return 0 for now
        return 0;
    }

    // --- internal helpers ---

    function _borrowStep(uint256 hf) internal view returns (uint256) {
        // naive: borrow a fraction to approach targetHF
        if (hf <= targetHF) return 0;
        // scale with distance from target
        uint256 denom = 10; // 10% step
        uint256 totalColStS = silo.collateralOf(address(this), sts.stSToken());
        // borrow ~10% of collateral worth in S
        uint256 sFromStS = (totalColStS * 1e18) / sts.rate();
        return sFromStS / denom;
    }

    function _withdrawStSCollateralForS(
        uint256 wantS
    ) internal returns (uint256 stSNeeded) {
        // convert desired S to stS using rate and withdraw that much collateral
        stSNeeded = (wantS * sts.rate()) / 1e18;
        silo.withdrawCollateral(sts.stSToken(), stSNeeded);
    }
}
