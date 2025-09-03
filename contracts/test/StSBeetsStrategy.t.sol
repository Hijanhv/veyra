// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {StSBeetsStrategy} from "src/strategies/StSBeetsStrategy.sol";
import {IStSAdapter} from "src/interfaces/adapters/IStSAdapter.sol";
import {IBeetsAdapter} from "src/interfaces/adapters/IBeetsAdapter.sol";

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

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
}

/// @notice Test StS adapter that converts S to stS tokens at 1:1 ratio and back
contract MockStSAdapter is IStSAdapter {
    using SafeERC20 for IERC20;
    address public override sToken;
    address public override stSToken;
    mapping(address => uint256) public staked;

    constructor(address _sToken, address _stSToken) {
        sToken = _sToken;
        stSToken = _stSToken;
    }

    function stakeS(uint256 amount) external override returns (uint256) {
        // take S tokens from user
        IERC20(sToken).safeTransferFrom(msg.sender, address(this), amount);
        // give back stS tokens 1:1
        MockERC20(stSToken).mint(msg.sender, amount);
        staked[msg.sender] += amount;
        return amount;
    }

    function unstakeToS(uint256 amount) external override returns (uint256) {
        // take stS from user and give back S tokens 1:1
        IERC20(stSToken).safeTransferFrom(msg.sender, address(this), amount);
        MockERC20(sToken).mint(msg.sender, amount);
        if (staked[msg.sender] >= amount) {
            staked[msg.sender] -= amount;
        }
        return amount;
    }

    function rate() external pure override returns (uint256) {
        return 1e18;
    }
}

/// @notice Test BEETS adapter that takes S and stS deposits to mint LP tokens.
///         Withdrawing burns LP tokens and returns the original amounts. Simple 1:1 pricing
contract MockBeetsAdapter is IBeetsAdapter {
    using SafeERC20 for IERC20;
    // LP token that gets created by this adapter
    MockERC20 public lpTokenInternal;
    // reward token (using S to keep things simple)
    address public rewardToken;
    // track how much LP each user has staked
    mapping(address => uint256) public staked;
    // remember what each user deposited so we can give it back
    mapping(address => uint256) public suppliedS;
    mapping(address => uint256) public suppliedStS;
    // rewards we'll give out when someone claims
    uint256 public rewardAmount;

    constructor(address _rewardToken) {
        rewardToken = _rewardToken;
        lpTokenInternal = new MockERC20("LP", "LP", 18);
    }

    function joinPool(
        address /*pool*/,
        address tokenA,
        address tokenB,
        uint256 amtA,
        uint256 amtB,
        uint256 /*minLPOut*/
    ) external override returns (uint256 lpOut) {
        // take tokens from user
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amtA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amtB);
        // remember how much they deposited
        suppliedS[msg.sender] += amtA;
        suppliedStS[msg.sender] += amtB;
        // create LP tokens equal to total deposited (keeping it simple)
        lpOut = amtA + amtB;
        lpTokenInternal.mint(msg.sender, lpOut);
    }

    function exitPool(
        address /*pool*/,
        uint256 lpAmount,
        address tokenA,
        address tokenB,
        uint256 /*minAmtA*/,
        uint256 /*minAmtB*/
    ) external override returns (uint256 amtA, uint256 amtB) {
        // take back LP tokens from user
        IERC20(address(lpTokenInternal)).safeTransferFrom(msg.sender, address(this), lpAmount);

        // figure out how much to return based on what they originally put in
        uint256 totalSupplied = suppliedS[msg.sender] + suppliedStS[msg.sender];
        if (totalSupplied == 0) return (0, 0);

        // calculate proportional amounts
        amtA = (suppliedS[msg.sender] * lpAmount) / totalSupplied;
        amtB = (suppliedStS[msg.sender] * lpAmount) / totalSupplied;

        // update our records
        if (amtA > suppliedS[msg.sender]) amtA = suppliedS[msg.sender];
        if (amtB > suppliedStS[msg.sender]) amtB = suppliedStS[msg.sender];
        suppliedS[msg.sender] -= amtA;
        suppliedStS[msg.sender] -= amtB;

        // send the right tokens back to user
        IERC20(tokenA).safeTransfer(msg.sender, amtA);
        IERC20(tokenB).safeTransfer(msg.sender, amtB);
    }

    function stakeInGauge(
        address /*gauge*/,
        uint256 lpAmount
    ) external override {
        IERC20(address(lpTokenInternal)).safeTransferFrom(msg.sender, address(this), lpAmount);
        staked[msg.sender] += lpAmount;
    }

    function unstakeFromGauge(
        address /*gauge*/,
        uint256 lpAmount
    ) external override {
        require(staked[msg.sender] >= lpAmount, "not staked");
        staked[msg.sender] -= lpAmount;
        IERC20(address(lpTokenInternal)).safeTransfer(msg.sender, lpAmount);
    }

    function harvestRewards(
        address /*gauge*/
    ) external override returns (uint256 rewards) {
        rewards = rewardAmount;
        if (rewards > 0) {
            MockERC20(rewardToken).mint(msg.sender, rewards);
            rewardAmount = 0;
        }
    }

    function getPoolLpToken(
        address /*pool*/
    ) external view override returns (address) {
        return address(lpTokenInternal);
    }

    function getPoolGauge(
        address /*pool*/
    ) external pure override returns (address) {
        return address(0xBEEF); // fake gauge for testing
    }

    function getPoolApr(
        address /*pool*/
    ) external pure override returns (uint256) {
        return 500; // 5% yield
    }

    function getStakedBalance(
        address /*gauge*/,
        address account
    ) external view override returns (uint256) {
        return staked[account];
    }

    function getPendingRewards(
        address /*gauge*/,
        address /*account*/
    ) external view override returns (uint256) {
        return rewardAmount;
    }

    function stSRate() external pure override returns (uint256) {
        return 1e18; // 1:1 rate to keep things simple
    }

    // helper function to set up rewards for testing
    function setReward(uint256 amount) external {
        rewardAmount = amount;
    }
}

contract StSBeetsStrategyTest is Test {
    using SafeERC20 for IERC20;
    MockERC20 sToken;
    MockERC20 stSToken;
    MockStSAdapter stsAdapter;
    MockBeetsAdapter beetsAdapter;
    StSBeetsStrategy strategy;
    address vault = address(0x1234);

    function setUp() public {
        // create our test tokens
        sToken = new MockERC20("S", "S", 18);
        stSToken = new MockERC20("stS", "stS", 18);
        stsAdapter = new MockStSAdapter(address(sToken), address(stSToken));
        beetsAdapter = new MockBeetsAdapter(address(sToken));
        // create the strategy
        strategy = new StSBeetsStrategy(
            address(sToken),
            vault,
            address(stsAdapter),
            address(beetsAdapter),
            address(0xBEEF) // fake pool for testing
        );
        // give vault some S tokens
        sToken.mint(vault, 1_000 ether);
        // act as the vault for testing
        vm.startPrank(vault);
        // let strategy and adapters spend tokens
        sToken.approve(address(strategy), type(uint256).max);
        sToken.approve(address(stsAdapter), type(uint256).max);
        sToken.approve(address(beetsAdapter), type(uint256).max);
        stSToken.approve(address(stsAdapter), type(uint256).max);
        stSToken.approve(address(beetsAdapter), type(uint256).max);
        vm.stopPrank();
    }

    function testDepositAndWithdraw() public {
        // vault puts in 100 S tokens
        uint256 depositAmount = 100 ether;
        vm.startPrank(vault);
        IERC20(address(sToken)).safeTransfer(address(strategy), depositAmount);
        strategy.deposit(depositAmount);
        vm.stopPrank();
        // should have some LP tokens staked
        assertGt(strategy.stakedLp(), 0);
        // vault takes out 50 S tokens
        vm.startPrank(vault);
        strategy.withdraw(50 ether);
        vm.stopPrank();
        // vault should get back 50 S tokens
        assertEq(sToken.balanceOf(vault), 1_000 ether - 100 ether + 50 ether);
    }

    function testHarvestRewards() public {
        // first deposit to create an LP position
        uint256 depositAmount = 20 ether;
        vm.startPrank(vault);
        IERC20(address(sToken)).safeTransfer(address(strategy), depositAmount);
        strategy.deposit(depositAmount);
        vm.stopPrank();
        // set up rewards and harvest them
        beetsAdapter.setReward(5 ether);
        vm.startPrank(vault);
        uint256 harvested = strategy.harvest();
        vm.stopPrank();
        assertEq(harvested, 5 ether);
        // strategy should now have the rewards
        assertEq(sToken.balanceOf(address(strategy)), 5 ether);
    }
}
