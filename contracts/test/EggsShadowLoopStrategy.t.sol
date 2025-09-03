// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {EggsShadowLoopStrategy} from "src/strategies/EggsShadowLoopStrategy.sol";
import {IEggsAdapter} from "src/interfaces/adapters/IEggsAdapter.sol";
import {IShadowAdapter} from "src/interfaces/adapters/IShadowAdapter.sol";
import {IStSAdapter} from "src/interfaces/adapters/IStSAdapter.sol";

/// @notice Basic ERC20 token implementation for testing S and stS tokens
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

/// @notice Test StS adapter that converts S to stS tokens and back at 1:1 ratio
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
        // give back stS tokens at 1:1 rate
        SimpleToken(stSToken).mint(msg.sender, amount);
        staked[msg.sender] += amount;
        return amount;
    }

    function unstakeToS(uint256 amount) external override returns (uint256) {
        // take back the stS tokens
        IERC20(stSToken).safeTransferFrom(msg.sender, address(this), amount);
        // return S tokens at 1:1 rate
        SimpleToken(sToken).mint(msg.sender, amount);
        if (staked[msg.sender] >= amount) staked[msg.sender] -= amount;
        return amount;
    }

    function rate() external pure override returns (uint256) {
        return 1e18;
    }
}

/// @notice Test Eggs adapter that handles minting, borrowing, redeeming and repaying
contract MockEggsAdapter is IEggsAdapter {
    using SafeERC20 for IERC20;
    SimpleToken public sToken;
    SimpleToken public eggs;
    mapping(address => uint256) public collateral;
    mapping(address => uint256) public debt;

    constructor(address _sToken) {
        sToken = SimpleToken(_sToken);
        eggs = new SimpleToken("EGGS", "EGGS");
    }

    function eggsToken() external view override returns (address) {
        return address(eggs);
    }

    function mintEggs(
        uint256 sAmount
    ) external override returns (uint256 eggsMinted) {
        // take S tokens from user
        IERC20(address(sToken)).safeTransferFrom(msg.sender, address(this), sAmount);
        // charge 2.5% minting fee
        eggsMinted = (sAmount * 975) / 1000;
        eggs.mint(msg.sender, eggsMinted);
        collateral[msg.sender] += eggsMinted;
    }

    function redeemEggs(
        uint256 eggsAmount
    ) external override returns (uint256 sAmount) {
        IERC20(address(eggs)).safeTransferFrom(msg.sender, address(this), eggsAmount);
        if (collateral[msg.sender] >= eggsAmount) {
            collateral[msg.sender] -= eggsAmount;
        }
        // give back S tokens 1:1
        sToken.mint(msg.sender, eggsAmount);
        return eggsAmount;
    }

    function borrowS(uint256 sAmount) external override {
        debt[msg.sender] += sAmount;
        sToken.mint(msg.sender, sAmount);
    }

    function repayS(
        uint256 sAmount
    ) external override returns (uint256 repaid) {
        uint256 owed = debt[msg.sender];
        repaid = sAmount > owed ? owed : sAmount;
        debt[msg.sender] = owed - repaid;
        IERC20(address(sToken)).safeTransferFrom(msg.sender, address(this), repaid);
        return repaid;
    }

    function collateralOf(
        address user
    ) external view override returns (uint256 eggsCollateral) {
        return collateral[user];
    }

    function debtOf(
        address user
    ) external view override returns (uint256 sDebt) {
        return debt[user];
    }

    function healthFactor(
        address /*user*/
    ) external pure override returns (uint256 hf) {
        return 2e18;
    }

    function getSupplyApy() external pure override returns (uint256 apy) {
        return 250; // 2.5%
    }

    function getBorrowApy() external pure override returns (uint256 apy) {
        return 500; // 5%
    }
}

/// @notice Test Shadow adapter that mimics Shadow's concentrated liquidity AMM
contract MockShadowAdapter is IShadowAdapter {
    using SafeERC20 for IERC20;
    // LP token that gets minted by this adapter
    SimpleToken public lpToken;
    // keep track of staked LP tokens for each user
    mapping(address => uint256) public staked;
    // remember how much each user supplied so we can return it later
    mapping(address => uint256) public suppliedA;
    mapping(address => uint256) public suppliedB;
    // rewards we'll give out when someone harvests
    uint256 public rewardAmount;
    // reward token (using S to keep things simple)
    address public rewardToken;

    constructor(address _rewardToken) {
        rewardToken = _rewardToken;
        lpToken = new SimpleToken("LP", "LP");
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
        suppliedA[msg.sender] += amtA;
        suppliedB[msg.sender] += amtB;
        lpOut = amtA + amtB;
        lpToken.mint(msg.sender, lpOut);
    }

    function exitPool(
        address /*pool*/,
        uint256 lpTokens,
        address tokenA,
        address tokenB,
        uint256 /*minAmtA*/,
        uint256 /*minAmtB*/
    ) external override returns (uint256 amtA, uint256 amtB) {
        IERC20(address(lpToken)).safeTransferFrom(msg.sender, address(this), lpTokens);
        // calculate how much to return proportionally
        uint256 totalSupplied = suppliedA[msg.sender] + suppliedB[msg.sender];
        if (totalSupplied == 0) return (0, 0);
        amtA = (suppliedA[msg.sender] * lpTokens) / totalSupplied;
        amtB = (suppliedB[msg.sender] * lpTokens) / totalSupplied;
        if (amtA > suppliedA[msg.sender]) amtA = suppliedA[msg.sender];
        if (amtB > suppliedB[msg.sender]) amtB = suppliedB[msg.sender];
        suppliedA[msg.sender] -= amtA;
        suppliedB[msg.sender] -= amtB;
        // send tokens back to user
        IERC20(tokenA).safeTransfer(msg.sender, amtA);
        IERC20(tokenB).safeTransfer(msg.sender, amtB);
    }

    function stakeInGauge(
        address /*gauge*/,
        uint256 lpTokens
    ) external override {
        IERC20(address(lpToken)).safeTransferFrom(msg.sender, address(this), lpTokens);
        staked[msg.sender] += lpTokens;
    }

    function unstakeFromGauge(
        address /*gauge*/,
        uint256 lpTokens
    ) external override {
        require(staked[msg.sender] >= lpTokens, "not staked");
        staked[msg.sender] -= lpTokens;
        IERC20(address(lpToken)).safeTransfer(msg.sender, lpTokens);
    }

    function harvestRewards(
        address /*gauge*/
    ) external override returns (uint256 rewards) {
        rewards = rewardAmount;
        if (rewards > 0) {
            SimpleToken(rewardToken).mint(msg.sender, rewards);
            rewardAmount = 0;
        }
    }

    function getPoolApr(
        address /*pool*/
    ) external pure override returns (uint256 apr) {
        return 500 * 1e14; // 5% yield: 500 basis points * 1e14 = 5e16. Since 1e18 = 100%, this gives us 5%
    }

    function getPoolLpToken(
        address /*pool*/
    ) external view override returns (address lpTokenAddr) {
        return address(lpToken);
    }

    function getPoolGauge(
        address /*pool*/
    ) external pure override returns (address gauge) {
        return address(0xBEEF);
    }

    function getStakedBalance(
        address /*gauge*/,
        address account
    ) external view override returns (uint256 balance) {
        return staked[account];
    }

    // helper function to set up rewards for testing
    function setReward(uint256 amount) external {
        rewardAmount = amount;
    }
}

contract EggsShadowLoopStrategyTest is Test {
    using SafeERC20 for IERC20;
    SimpleToken sToken;
    SimpleToken stSToken;
    MockEggsAdapter eggs;
    MockStSAdapter stsAdapter;
    MockShadowAdapter shadow;
    EggsShadowLoopStrategy strategy;
    address vault = address(0xDEAD);

    function setUp() public {
        sToken = new SimpleToken("S", "S");
        stSToken = new SimpleToken("stS", "stS");
        eggs = new MockEggsAdapter(address(sToken));
        stsAdapter = new MockStSAdapter(address(sToken), address(stSToken));
        shadow = new MockShadowAdapter(address(sToken));
        // Create strategy with 50% borrow ratio, 1.5 health factor target, no iterations
        strategy = new EggsShadowLoopStrategy(
            address(sToken),
            vault,
            address(eggs),
            address(stsAdapter),
            address(shadow),
            address(0xCAFE), // dummy pool
            address(0xBEEF), // gauge
            5000,
            15e17, // 1.5e18
            0
        );
        // Give the vault some S tokens
        sToken.mint(vault, 1_000 ether);
        // act as the vault and approve all the contracts
        vm.startPrank(vault);
        sToken.approve(address(strategy), type(uint256).max);
        sToken.approve(address(eggs), type(uint256).max);
        sToken.approve(address(shadow), type(uint256).max);
        sToken.approve(address(stsAdapter), type(uint256).max);
        stSToken.approve(address(stsAdapter), type(uint256).max);
        stSToken.approve(address(shadow), type(uint256).max);
        vm.stopPrank();
    }

    function testDeposit() public {
        uint256 amount = 100 ether;
        // send S tokens to strategy and deposit them
        vm.startPrank(vault);
        IERC20(address(sToken)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        vm.stopPrank();
        // Should have about 97.5 S worth of EGGS collateral
        uint256 coll = eggs.collateralOf(address(strategy));
        // minting 100 S with 2.5% fee = 97.5 EGGS
        assertEq(coll, 97.5 ether, "incorrect eggs collateral");
        // debt should be 50% of collateral = 48.75
        uint256 debt = eggs.debtOf(address(strategy));
        assertEq(debt, 48.75 ether, "incorrect debt");
        // should have some LP tokens staked
        assertGt(strategy.stakedLp(), 0, "no LP staked");
    }

    function testWithdraw() public {
        uint256 amount = 100 ether;
        // first deposit some tokens
        vm.startPrank(vault);
        IERC20(address(sToken)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        // then withdraw half of it
        strategy.withdraw(50 ether);
        vm.stopPrank();
        // vault should get back 50 S tokens
        assertEq(sToken.balanceOf(vault), 1_000 ether - amount + 50 ether);
        // all debt should be cleared after unwinding
        assertEq(eggs.debtOf(address(strategy)), 0);
        // no LP tokens should be staked anymore
        assertEq(strategy.stakedLp(), 0);
    }

    function testHarvestRewards() public {
        uint256 amount = 20 ether;
        vm.startPrank(vault);
        IERC20(address(sToken)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        // set up some rewards and harvest them
        shadow.setReward(5 ether);
        uint256 harvested = strategy.harvest();
        vm.stopPrank();
        assertEq(harvested, 5 ether);
        // strategy should now have the rewards (S tokens)
        assertEq(sToken.balanceOf(address(strategy)), 5 ether);
    }
}
