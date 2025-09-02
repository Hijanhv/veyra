// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {AaveRingsCarryStrategy} from "src/strategies/AaveRingsCarryStrategy.sol";
import {IRingsAdapter} from "src/interfaces/adapters/IRingsAdapter.sol";
import {ILendingAdapter} from "src/interfaces/adapters/ILendingAdapter.sol";

/// @notice Basic ERC20 token implementation for testing wS and USDC functionality
contract DummyToken is IERC20 {
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

/// @notice Test implementation of Rings adapter that handles scUSD minting and redemption
contract MockRings is IRingsAdapter {
    DummyToken public scToken;
    address public usdc;

    constructor(address _usdc) {
        usdc = _usdc;
        scToken = new DummyToken("scUSD", "scUSD");
    }

    function scUSD() external view override returns (address) {
        return address(scToken);
    }

    function mint_scUSD(uint256 usdcIn) external override returns (uint256) {
        IERC20(usdc).transferFrom(msg.sender, address(this), usdcIn);
        scToken.mint(msg.sender, usdcIn);
        return usdcIn;
    }

    function redeem_scUSD(
        uint256 scAmount
    ) external override returns (uint256) {
        scToken.transferFrom(msg.sender, address(this), scAmount);
        DummyToken(usdc).mint(msg.sender, scAmount);
        return scAmount;
    }

    function getAPY() external pure override returns (uint256) {
        return 1300; // 13% APY
    }
}

/// @notice Test lending adapter that simulates Aave protocol behavior
contract MockLending is ILendingAdapter {
    mapping(address => mapping(address => uint256)) public coll;
    mapping(address => mapping(address => uint256)) public deb;

    function deposit(address token, uint256 amount) external override {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        coll[msg.sender][token] += amount;
    }

    function withdraw(
        address token,
        uint256 amount
    ) external override returns (uint256) {
        uint256 c = coll[msg.sender][token];
        require(c >= amount, "no collateral");
        coll[msg.sender][token] = c - amount;
        DummyToken(token).mint(msg.sender, amount);
        return amount;
    }

    function borrow(address token, uint256 amount) external override {
        deb[msg.sender][token] += amount;
        DummyToken(token).mint(msg.sender, amount);
    }

    function repay(
        address token,
        uint256 amount
    ) external override returns (uint256) {
        uint256 owed = deb[msg.sender][token];
        uint256 repaid = amount > owed ? owed : amount;
        deb[msg.sender][token] = owed - repaid;
        IERC20(token).transferFrom(msg.sender, address(this), repaid);
        return repaid;
    }

    function collateralOf(
        address user,
        address token
    ) external view override returns (uint256) {
        return coll[user][token];
    }

    function debtOf(
        address user,
        address token
    ) external view override returns (uint256) {
        return deb[user][token];
    }

    function healthFactor(address) external pure override returns (uint256) {
        return 2e18;
    }

    function getSupplyAPY(address) external pure override returns (uint256) {
        return 250; // 2.5% APY
    }

    function getBorrowAPY(address) external pure override returns (uint256) {
        return 450; // 4.5% APY
    }
}

contract AaveRingsCarryStrategyTest is Test {
    DummyToken wS;
    DummyToken usdc;
    MockRings rings;
    MockLending lend;
    AaveRingsCarryStrategy strategy;
    address vault = address(0x1111);

    function setUp() public {
        wS = new DummyToken("wS", "wS");
        usdc = new DummyToken("USDC", "USDC");
        rings = new MockRings(address(usdc));
        lend = new MockLending();
        // Set borrow ratio to 50% (5000 basis points)
        strategy = new AaveRingsCarryStrategy(
            address(wS),
            vault,
            address(lend),
            address(rings),
            address(usdc),
            5000
        );
        // Give the vault some tokens and approve the strategy to spend them
        wS.mint(vault, 1000 ether);
        usdc.mint(address(lend), 1000 ether);
        vm.startPrank(vault);
        wS.approve(address(strategy), type(uint256).max);
        usdc.approve(address(rings), type(uint256).max);
        usdc.approve(address(lend), type(uint256).max);
        vm.stopPrank();
    }

    function testDeposit() public {
        uint256 amount = 100 ether;
        vm.startPrank(vault);
        // Send wS tokens to the strategy
        wS.transfer(address(strategy), amount);
        strategy.deposit(amount);
        vm.stopPrank();
        // Verify the strategy deposited collateral and borrowed correctly
        assertEq(lend.collateralOf(address(strategy), address(wS)), amount);
        // Should have borrowed USDC equal to half the deposit amount
        assertEq(lend.debtOf(address(strategy), address(usdc)), amount / 2);
        // scUSD balance should match the amount we borrowed
        assertEq(
            IERC20(rings.scUSD()).balanceOf(address(strategy)),
            amount / 2
        );
    }

    function testWithdraw() public {
        uint256 amount = 100 ether;
        vm.startPrank(vault);
        wS.transfer(address(strategy), amount);
        strategy.deposit(amount);
        // Try withdrawing half the amount
        strategy.withdraw(50 ether);
        vm.stopPrank();
        // The vault should get back exactly 50 wS tokens
        assertEq(wS.balanceOf(vault), 1000 ether - amount + 50 ether);
        // All debt should be cleared after redeeming scUSD and repaying
        assertEq(lend.debtOf(address(strategy), address(usdc)), 0);
    }
}
