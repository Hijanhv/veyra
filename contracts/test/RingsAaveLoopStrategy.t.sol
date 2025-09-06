// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {RingsAaveLoopStrategy} from "src/strategies/RingsAaveLoopStrategy.sol";
import {IRingsAdapter} from "src/interfaces/adapters/IRingsAdapter.sol";
import {ILendingAdapter} from "src/interfaces/adapters/ILendingAdapter.sol";

/// @notice Basic ERC20 token for testing
contract SimpleToken is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        decimals = 18;
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

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
}

/// @notice Test Rings adapter for minting and redeeming scUSD
contract MockRingsAdapter is IRingsAdapter {
    using SafeERC20 for IERC20;
    SimpleToken public scToken;
    address public usdc;

    constructor(address _usdc) {
        usdc = _usdc;
        scToken = new SimpleToken("scUSD", "scUSD");
    }

    function scUsd() external view override returns (address) {
        return address(scToken);
    }

    function mintScUsd(
        uint256 usdcIn
    ) external override returns (uint256 scMinted) {
        // take USDC from user
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), usdcIn);
        // give back scUSD tokens 1:1
        scToken.mint(msg.sender, usdcIn);
        return usdcIn;
    }

    function redeemScUsd(
        uint256 scAmount
    ) external override returns (uint256 usdcOut) {
        // take back scUSD from user
        IERC20(address(scToken)).safeTransferFrom(
            msg.sender,
            address(this),
            scAmount
        );
        // return USDC tokens 1:1
        SimpleToken(usdc).mint(msg.sender, scAmount);
        return scAmount;
    }

    function getApy() external pure override returns (uint256) {
        return 1300; // 13% APY
    }
}

/// @notice Test lending adapter that mimics Aave. Tracks collateral and debt
///         and handles deposits, withdrawals, borrowing and repaying
contract MockLendingAdapter is ILendingAdapter {
    using SafeERC20 for IERC20;
    mapping(address => mapping(address => uint256)) public collateral;
    mapping(address => mapping(address => uint256)) public debt;
    // Start with high health factor - can be changed for testing
    uint256 public hf = 2e18;

    function deposit(address token, uint256 amount) external override {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        collateral[msg.sender][token] += amount;
    }

    function withdraw(
        address token,
        uint256 amount
    ) external override returns (uint256) {
        require(collateral[msg.sender][token] >= amount, "no collateral");
        collateral[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        return amount;
    }

    function borrow(address token, uint256 amount) external override {
        // Just mint tokens to keep it simple
        debt[msg.sender][token] += amount;
        SimpleToken(token).mint(msg.sender, amount);
    }

    function repay(
        address token,
        uint256 amount
    ) external override returns (uint256) {
        uint256 owed = debt[msg.sender][token];
        uint256 repaid = amount > owed ? owed : amount;
        debt[msg.sender][token] -= repaid;
        IERC20(token).safeTransferFrom(msg.sender, address(this), repaid);
        return repaid;
    }

    function collateralOf(
        address user,
        address token
    ) external view override returns (uint256) {
        return collateral[user][token];
    }

    function debtOf(
        address user,
        address token
    ) external view override returns (uint256) {
        return debt[user][token];
    }

    function healthFactor(
        address /*user*/
    ) external view override returns (uint256) {
        return hf;
    }

    function getSupplyApy(address) external pure override returns (uint256) {
        return 250; // 2.5% APY
    }

    function getBorrowApy(address) external pure override returns (uint256) {
        return 450; // 4.5% APY
    }

    /// @notice Helper to change health factor for testing
    function setHealthFactor(uint256 _hf) external {
        hf = _hf;
    }
}

contract RingsAaveLoopStrategyTest is Test {
    using SafeERC20 for IERC20;
    SimpleToken usdc;
    MockRingsAdapter rings;
    MockLendingAdapter lending;
    RingsAaveLoopStrategy strategy;
    address vault = address(0xABCD);

    function setUp() public {
        usdc = new SimpleToken("USDC", "USDC");
        rings = new MockRingsAdapter(address(usdc));
        lending = new MockLendingAdapter();
        // Start with a healthy health factor
        lending.setHealthFactor(2e18);
        // Create strategy with target health factor 1.5 and max 3 iterations
        strategy = new RingsAaveLoopStrategy(
            address(usdc),
            vault,
            address(rings),
            address(lending),
            15e17, // 1.5e18
            3
        );
        // Give vault some USDC and approve all contracts
        usdc.mint(vault, 1_000 ether);
        vm.startPrank(vault);
        usdc.approve(address(strategy), type(uint256).max);
        usdc.approve(address(rings), type(uint256).max);
        usdc.approve(address(lending), type(uint256).max);
        vm.stopPrank();
    }

    function testDepositAndWithdraw() public {
        uint256 amount = 100 ether;
        vm.startPrank(vault);
        IERC20(address(usdc)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        vm.stopPrank();
        // Should have some collateral and debt after depositing
        assertGt(lending.collateralOf(address(strategy), rings.scUsd()), 0);
        assertGt(lending.debtOf(address(strategy), address(usdc)), 0);
        // Now withdraw half the amount
        vm.startPrank(vault);
        strategy.withdraw(50 ether);
        vm.stopPrank();
        // Vault should get back 50 USDC
        assertEq(usdc.balanceOf(vault), 1_000 ether - 100 ether + 50 ether);
    }
}
