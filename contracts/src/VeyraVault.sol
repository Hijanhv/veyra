// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "lib/openzeppelin-contracts/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";

import {IYieldStrategy} from "./interfaces/IYieldStrategy.sol";

/**
 * @title VeyraVault
 * @notice AI-driven yield optimization vault supporting multiple DeFi protocols
 * @dev ERC4626 compliant vault with strategy allocation management
 */
contract VeyraVault is ERC4626, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event StrategyAllocated(address indexed strategy, uint256 amount);
    event StrategyWithdrawn(address indexed strategy, uint256 amount);
    event RebalanceExecuted(address[] strategies, uint256[] allocations);
    event YieldHarvested(uint256 totalYield);
    event StrategyDeposit(address indexed strategy, uint256 assets);
    event StrategyWithdrawal(address indexed strategy, uint256 assets);
    event StrategyAllocationUpdated(address indexed strategy, uint256 bps);

    /*//////////////////////////////////////////////////////////////
                               STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum number of strategies allowed
    uint256 public constant MAX_STRATEGIES = 10;

    /// @notice Authorized strategy manager (AI agent)
    address public strategyManager;

    /// @notice Active yield strategies
    IYieldStrategy[] public strategies;

    /// @notice Strategy allocation percentages (basis points)
    mapping(IYieldStrategy => uint256) public allocations;

    /// @notice Total allocation percentage (should equal 10000 basis points)
    uint256 public totalAllocation;

    /// @notice Emergency pause state
    bool public emergencyPaused;

    // Sonic FeeM registry contract
    address private constant _FEEM = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830);

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyStrategyManager() {
        require(
            msg.sender == strategyManager,
            "Not authorized strategy manager"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!emergencyPaused, "Vault is paused");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _strategyManager
    ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(msg.sender) {
        strategyManager = _strategyManager;
    }

    /// @dev Register this vault contract on Sonic FeeM under given project ID
    function registerMe(uint256 projectId) external onlyOwner {
        (bool _success, ) = _FEEM.call(
            abi.encodeWithSignature("selfRegister(uint256)", projectId)
        );
        require(_success, "FeeM registration failed");
    }

    /*//////////////////////////////////////////////////////////////
                        STRATEGY MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Add a new yield strategy to the vault
     * @param strategy The strategy contract to add
     * @param allocation Initial allocation in basis points (0-10000)
     */
    function addStrategy(
        IYieldStrategy strategy,
        uint256 allocation
    ) external onlyOwner {
        require(strategies.length < MAX_STRATEGIES, "Max strategies reached");
        require(allocation <= 10000, "Allocation too high");
        require(
            totalAllocation + allocation <= 10000,
            "Total allocation exceeded"
        );

        strategies.push(strategy);
        allocations[strategy] = allocation;
        totalAllocation += allocation;

        emit StrategyAllocated(address(strategy), allocation);
        emit StrategyAllocationUpdated(address(strategy), allocation);
    }

    /**
     * @notice Rebalance allocations across strategies (AI-driven)
     * @param newAllocations Array of new allocation percentages
     */
    function rebalance(
        uint256[] calldata newAllocations
    ) external onlyStrategyManager whenNotPaused nonReentrant {
        require(
            newAllocations.length == strategies.length,
            "Invalid allocations length"
        );

        uint256 totalNewAllocation;
        for (uint256 i = 0; i < newAllocations.length; i++) {
            totalNewAllocation += newAllocations[i];
            allocations[strategies[i]] = newAllocations[i];
            emit StrategyAllocationUpdated(
                address(strategies[i]),
                newAllocations[i]
            );
        }

        require(totalNewAllocation <= 10000, "Total allocation exceeded");
        totalAllocation = totalNewAllocation;

        // Execute rebalancing
        _executeRebalance();

        address[] memory strategyAddresses = new address[](strategies.length);
        for (uint256 i = 0; i < strategies.length; i++) {
            strategyAddresses[i] = address(strategies[i]);
        }

        emit RebalanceExecuted(strategyAddresses, newAllocations);
    }

    /**
     * @notice Harvest yield from all strategies
     */
    function harvestYield() external onlyStrategyManager nonReentrant {
        uint256 totalHarvested;

        for (uint256 i = 0; i < strategies.length; i++) {
            uint256 harvested = strategies[i].harvest();
            totalHarvested += harvested;
        }

        emit YieldHarvested(totalHarvested);
    }

    /*//////////////////////////////////////////////////////////////
                        ERC4626 OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Calculate total assets including deployed capital
     */
    function totalAssets() public view override returns (uint256) {
        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));
        uint256 deployedAssets;

        for (uint256 i = 0; i < strategies.length; i++) {
            deployedAssets += strategies[i].totalAssets();
        }

        return idleAssets + deployedAssets;
    }

    /**
     * @notice Deposit with automatic strategy allocation
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override whenNotPaused {
        super._deposit(caller, receiver, assets, shares);

        // Deploy assets to strategies based on current allocations
        _deployAssets(assets);
    }

    /**
     * @notice Withdraw from strategies if needed
     */
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));

        if (assets > idleAssets) {
            // Withdraw from strategies
            uint256 needed = assets - idleAssets;
            _withdrawFromStrategies(needed);
        }

        super._withdraw(caller, receiver, owner, assets, shares);
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deploy assets to strategies based on allocations
     */
    function _deployAssets(uint256 assets) internal {
        for (uint256 i = 0; i < strategies.length; i++) {
            if (allocations[strategies[i]] > 0) {
                uint256 strategyAmount = (assets * allocations[strategies[i]]) /
                    10000;
                if (strategyAmount > 0) {
                    IERC20(asset()).safeTransfer(
                        address(strategies[i]),
                        strategyAmount
                    );
                    strategies[i].deposit(strategyAmount);
                    emit StrategyDeposit(
                        address(strategies[i]),
                        strategyAmount
                    );
                }
            }
        }
    }

    /**
     * @notice Withdraw assets from strategies
     */
    function _withdrawFromStrategies(uint256 needed) internal {
        uint256 remaining = needed;

        for (uint256 i = 0; i < strategies.length && remaining > 0; i++) {
            uint256 strategyBalance = strategies[i].totalAssets();
            if (strategyBalance > 0) {
                uint256 toWithdraw = remaining > strategyBalance
                    ? strategyBalance
                    : remaining;
                strategies[i].withdraw(toWithdraw);
                remaining -= toWithdraw;
                emit StrategyWithdrawal(address(strategies[i]), toWithdraw);
            }
        }
    }

    /**
     * @notice Execute strategy rebalancing
     */
    function _executeRebalance() internal {
        // Snapshot current state
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        uint256 len = strategies.length;
        if (len == 0) return;

        // Collect current balances and compute total assets
        uint256[] memory current = new uint256[](len);
        uint256 deployed;
        for (uint256 i = 0; i < len; i++) {
            uint256 bal = strategies[i].totalAssets();
            current[i] = bal;
            deployed += bal;
        }
        uint256 total = idle + deployed;
        if (total == 0) return;

        // Compute desired balances per strategy according to target allocations
        uint256[] memory desired = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            uint256 bps = allocations[strategies[i]];
            desired[i] = (total * bps) / 10000;
        }

        // Phase 1: Withdraw from over-allocated strategies to increase idle
        for (uint256 i = 0; i < len; i++) {
            if (current[i] > desired[i]) {
                uint256 excess = current[i] - desired[i];
                if (excess > 0) {
                    // Withdraw excess; strategy is expected to transfer asset back to this vault
                    strategies[i].withdraw(excess);
                    current[i] -= excess;
                    idle += excess;
                    emit StrategyWithdrawal(address(strategies[i]), excess);
                }
            }
        }

        // Phase 2: Deploy idle to under-allocated strategies
        for (uint256 i = 0; i < len && idle > 0; i++) {
            if (current[i] < desired[i]) {
                uint256 deficit = desired[i] - current[i];
                uint256 toDeploy = deficit <= idle ? deficit : idle;
                if (toDeploy > 0) {
                    IERC20(asset()).safeTransfer(address(strategies[i]), toDeploy);
                    strategies[i].deposit(toDeploy);
                    current[i] += toDeploy;
                    idle -= toDeploy;
                    emit StrategyDeposit(address(strategies[i]), toDeploy);
                }
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emergency pause all operations
     */
    function emergencyPause() external onlyOwner {
        emergencyPaused = true;
    }

    /**
     * @notice Unpause operations
     */
    function unpause() external onlyOwner {
        emergencyPaused = false;
    }

    /**
     * @notice Update strategy manager
     */
    function setStrategyManager(address newManager) external onlyOwner {
        strategyManager = newManager;
    }
}
