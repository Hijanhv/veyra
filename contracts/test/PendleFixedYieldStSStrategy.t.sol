// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {PendleFixedYieldStSStrategy} from "../src/strategies/PendleFixedYieldStSStrategy.sol";
import {IPendleAdapter} from "../src/interfaces/adapters/IPendleAdapter.sol";
import {ILendingAdapter} from "../src/interfaces/adapters/ILendingAdapter.sol";

/// @notice Basic ERC20 token for testing
contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function transfer(
        address to,
        uint256 amount
    ) external override returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(
        address spender,
        uint256 amount
    ) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external override returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    /// @notice Helper to create tokens for testing
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
}

/// @notice Test Pendle adapter that mimics splitting stS into principal and yield tokens,
///         selling the yield tokens for stable assets and converting between them
contract MockPendleAdapter is IPendleAdapter {
    using SafeERC20 for IERC20;
    MockERC20 public immutable UNDERLYING;
    MockERC20 public immutable STABLE;
    MockERC20 public pt;
    MockERC20 public yt;

    constructor(address _underlying, address _stable) {
        UNDERLYING = MockERC20(_underlying);
        STABLE = MockERC20(_stable);
        pt = new MockERC20("PT", "PT", 18);
        yt = new MockERC20("YT", "YT", 18);
    }

    function stableToken() external view override returns (address) {
        return address(STABLE);
    }

    function ytToken() external view override returns (address) {
        return address(yt);
    }

    function ptToken() external view override returns (address) {
        return address(pt);
    }

    function splitAsset(
        uint256 amount
    ) external override returns (uint256 ptAmount, uint256 ytAmount) {
        // take the underlying tokens from user
        IERC20(address(UNDERLYING)).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );
        // give back PT and YT tokens 1:1
        pt.mint(msg.sender, amount);
        yt.mint(msg.sender, amount);
        return (amount, amount);
    }

    function redeemPrincipal(
        uint256 ptAmount
    ) external override returns (uint256 underlyingAmount) {
        // take PT tokens from user
        IERC20(address(pt)).safeTransferFrom(
            msg.sender,
            address(this),
            ptAmount
        );
        // return underlying tokens 1:1
        UNDERLYING.mint(msg.sender, ptAmount);
        return ptAmount;
    }

    function sellYtForStable(
        uint256 ytAmount
    ) external override returns (uint256 stableAmount) {
        // take YT tokens from user
        IERC20(address(yt)).safeTransferFrom(
            msg.sender,
            address(this),
            ytAmount
        );
        // give back stable tokens 1:1
        STABLE.mint(msg.sender, ytAmount);
        return ytAmount;
    }

    function stableToUnderlying(
        uint256 stableAmount
    ) external override returns (uint256 underlyingAmount) {
        // take stable tokens from user
        IERC20(address(STABLE)).safeTransferFrom(
            msg.sender,
            address(this),
            stableAmount
        );
        // return underlying tokens 1:1
        UNDERLYING.mint(msg.sender, stableAmount);
        return stableAmount;
    }
}

/// @notice Test lending adapter that handles deposits and withdrawals.
///         Only tracks collateral balances - no borrowing needed for this test
contract MockLendingAdapter is ILendingAdapter {
    using SafeERC20 for IERC20;
    mapping(address => mapping(address => uint256)) public collateral;

    function deposit(address token, uint256 amount) external override {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        collateral[msg.sender][token] += amount;
    }

    function withdraw(
        address token,
        uint256 amount
    ) external override returns (uint256) {
        uint256 bal = collateral[msg.sender][token];
        require(bal >= amount, "no collateral");
        collateral[msg.sender][token] = bal - amount;
        // create tokens and send back to user (simulates redemption)
        MockERC20(token).mint(msg.sender, amount);
        return amount;
    }

    function borrow(address, uint256) external pure override {
        revert("borrow not supported");
    }

    function repay(address, uint256) external pure override returns (uint256) {
        revert("repay not supported");
    }

    function collateralOf(
        address user,
        address token
    ) external view override returns (uint256) {
        return collateral[user][token];
    }

    function debtOf(address, address) external pure override returns (uint256) {
        return 0;
    }

    function healthFactor(address) external pure override returns (uint256) {
        return 2e18;
    }

    function getSupplyApy(address) external pure override returns (uint256) {
        return 300; // 3% APY
    }

    function getBorrowApy(address) external pure override returns (uint256) {
        return 0;
    }
}

contract PendleFixedYieldStSStrategyTest is Test {
    using SafeERC20 for IERC20;
    MockERC20 stS;
    MockERC20 stable;
    MockPendleAdapter pendle;
    MockLendingAdapter lending;
    PendleFixedYieldStSStrategy strategy;
    address vault = address(0x9999);

    function setUp() public {
        stS = new MockERC20("stS", "stS", 18);
        stable = new MockERC20("scUSD", "scUSD", 18);
        pendle = new MockPendleAdapter(address(stS), address(stable));
        lending = new MockLendingAdapter();
        // Create strategy using stS as the main asset
        strategy = new PendleFixedYieldStSStrategy(
            address(stS),
            vault,
            address(pendle),
            address(lending)
        );
        // Give the vault some stS tokens
        stS.mint(vault, 1_000 ether);
        // Let the vault approve all necessary contracts
        vm.startPrank(vault);
        stS.approve(address(strategy), type(uint256).max);
        stS.approve(address(pendle), type(uint256).max);
        stable.approve(address(pendle), type(uint256).max);
        stable.approve(address(lending), type(uint256).max);
        vm.stopPrank();
    }

    function testDeposit() public {
        uint256 amount = 100 ether;
        vm.startPrank(vault);
        // Send stS to strategy and deposit it
        IERC20(address(stS)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        vm.stopPrank();
        // Strategy should have PT tokens equal to what we deposited
        assertEq(strategy.ptBalance(), amount);
        // Lending adapter should show stable collateral equal to the YT we sold
        assertEq(
            lending.collateralOf(address(strategy), address(stable)),
            amount
        );
    }

    function testWithdrawPartial() public {
        uint256 amount = 100 ether;
        vm.startPrank(vault);
        IERC20(address(stS)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        vm.stopPrank();
        // Try withdrawing 40 stS
        vm.startPrank(vault);
        strategy.withdraw(40 ether);
        vm.stopPrank();
        // Vault should get back 40 stS (plus the 900 remaining from before)
        assertEq(stS.balanceOf(vault), 1_000 ether - amount + 40 ether);
        // Should have 60 stable tokens left as collateral
        assertEq(
            lending.collateralOf(address(strategy), address(stable)),
            60 ether
        );
        // PT balance should still be the original amount
        assertEq(strategy.ptBalance(), amount);
    }
}
