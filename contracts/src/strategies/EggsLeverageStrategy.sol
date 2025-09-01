// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseStrategy.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IEggsAdapter} from "../interfaces/adapters/IEggsAdapter.sol";

contract EggsLeverageStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IEggsAdapter public immutable eggs;
    address public immutable S;
    address public immutable EGGS;

    uint256 public targetHF; // e.g., 1.6e18
    uint256 public maxIterations; // risk cap

    constructor(
        address _sToken,
        address _vault,
        address _eggsAdapter,
        uint256 _targetHF,
        uint256 _maxIter
    ) BaseStrategy(_sToken, _vault) {
        eggs = IEggsAdapter(_eggsAdapter);
        S = _sToken;
        EGGS = eggs.eggsToken();
        targetHF = _targetHF;
        maxIterations = _maxIter;

        IERC20(S).approve(_eggsAdapter, type(uint256).max);
        IERC20(EGGS).approve(_eggsAdapter, type(uint256).max);
    }

    function deposit(uint256 amount) external override onlyVault nonReentrant {
        // mint EGGS from S; deposit as collateral; borrow S; loop
        uint256 minted = eggs.mintFromS(amount);
        eggs.depositCollateral(minted);

        uint256 it;
        while (it < maxIterations) {
            uint256 hf = eggs.healthFactor(address(this));
            if (hf <= targetHF) break;
            uint256 step = IERC20(EGGS).balanceOf(address(this)) / 10;
            if (step == 0) step = minted / 10;

            // borrow some S
            eggs.borrowS(step);
            // mint more EGGS and deposit
            uint256 more = eggs.mintFromS(step);
            eggs.depositCollateral(more);
            it++;
        }
    }

    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        // repay using free S first
        uint256 free = IERC20(S).balanceOf(address(this));
        if (free < amount) {
            uint256 debt = eggs.debtOf(address(this));
            if (debt > 0) {
                // redeem EGGS -> S to repay
                uint256 toRepay = debt < amount ? debt : amount;
                uint256 eggsBal = IERC20(EGGS).balanceOf(address(this));
                if (eggsBal > 0) {
                    uint256 sOut = eggs.redeemToS(eggsBal);
                    eggs.repayS(sOut > toRepay ? toRepay : sOut);
                }
            }
        }
        // make sure we have S to return
        uint256 finalFree = IERC20(S).balanceOf(address(this));
        require(finalFree >= amount, "insufficient S");
        IERC20(S).safeTransfer(vault, amount);
    }

    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256)
    {
        // fees/yield realized via EGGS mechanics; nothing explicit here
        return 0;
    }

    function totalAssets() external view override returns (uint256) {
        // rough: free S + (redeemable S from EGGS collateral) - debt
        uint256 sFree = IERC20(S).balanceOf(address(this));
        uint256 debt = eggs.debtOf(address(this));
        // don't try to value EGGS; keep conservative
        return sFree > debt ? sFree - debt : 0;
    }

    function apy() external pure override returns (uint256) {
        return 0;
    }
}
