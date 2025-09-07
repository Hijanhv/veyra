import { ponder } from "ponder:registry";
import {
  vaultMetrics,
  deposits,
  withdrawals,
  strategyEvents,
  rebalances,
  userBalances,
  yieldHarvests,
} from "ponder:schema";

// Helper function to calculate share price
function calculateSharePrice(totalAssets: bigint, totalSupply: bigint): bigint {
  if (totalSupply === 0n) return 0n;
  return (totalAssets * 10n ** 18n) / totalSupply;
}

// Helper function to create user balance ID
const lc = (a: `0x${string}`) => a.toLowerCase() as `0x${string}`;
function getUserBalanceId(user: `0x${string}`, vault: `0x${string}`): string {
  return `${lc(user)}-${lc(vault)}`;
}

// Track deposits
ponder.on("VeyraVault:Deposit", async ({ event, context }) => {
  const { sender, owner, assets, shares } = event.args;

  // Record the deposit event
  await context.db.insert(deposits).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    vault: lc(event.log.address),
    sender: lc(sender),
    owner: lc(owner),
    assets,
    shares,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update user balance
  const userBalanceId = getUserBalanceId(owner, event.log.address);
  await context.db
    .insert(userBalances)
    .values({
      id: userBalanceId,
      user: lc(owner),
      vault: lc(event.log.address),
      shares,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate((row) => ({
      shares: row.shares + shares,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
    }));

  // Update metrics after deposit
  await updateVaultMetrics(event, context);
});

// Track withdrawals
ponder.on("VeyraVault:Withdraw", async ({ event, context }) => {
  const { sender, receiver, owner, assets, shares } = event.args;

  // Record the withdrawal event
  await context.db.insert(withdrawals).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    vault: lc(event.log.address),
    sender: lc(sender),
    receiver: lc(receiver),
    owner: lc(owner),
    assets,
    shares,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update user balance
  const userBalanceId = getUserBalanceId(owner, event.log.address);
  await context.db
    .insert(userBalances)
    .values({
      id: userBalanceId,
      user: lc(owner),
      vault: lc(event.log.address),
      shares: 0n - shares, // This will be negative, but we'll handle it in onConflictDoUpdate
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate((row) => ({
      shares: row.shares - shares,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
    }));

  // Update metrics after withdrawal
  await updateVaultMetrics(event, context);
});

// Track strategy deposits
ponder.on("VeyraVault:StrategyDeposit", async ({ event, context }) => {
  const { strategy, assets } = event.args;

  await context.db.insert(strategyEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    vault: lc(event.log.address),
    strategy: lc(strategy),
    eventType: "deposit",
    amount: assets,
    allocation: null,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

// Track strategy withdrawals
ponder.on("VeyraVault:StrategyWithdrawal", async ({ event, context }) => {
  const { strategy, assets } = event.args;

  await context.db.insert(strategyEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    vault: lc(event.log.address),
    strategy: lc(strategy),
    eventType: "withdrawal",
    amount: assets,
    allocation: null,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

// Track strategy allocation updates
ponder.on("VeyraVault:StrategyAllocationUpdated", async ({ event, context }) => {
  const { strategy, bps } = event.args;

  await context.db.insert(strategyEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    vault: lc(event.log.address),
    strategy: lc(strategy),
    eventType: "allocation_updated",
    amount: null,
    allocation: bps,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

// Track rebalance events
ponder.on("VeyraVault:RebalanceExecuted", async ({ event, context }) => {
  const { strategies, allocations } = event.args;

  await context.db.insert(rebalances).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    vault: lc(event.log.address),
    strategies: strategies.map((addr: `0x${string}`) => addr.toLowerCase()),
    allocations: Array.from(allocations),
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update metrics after rebalance
  await updateVaultMetrics(event, context);
});

// Track yield harvesting
ponder.on("VeyraVault:YieldHarvested", async ({ event, context }) => {
  const { totalYield } = event.args;

  await context.db.insert(yieldHarvests).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    vault: lc(event.log.address),
    totalYield,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update metrics after yield harvest
  await updateVaultMetrics(event, context);
});

// Update vault metrics on every significant event
async function updateVaultMetrics(event: any, context: any) {
  // Read current vault state (use event.log.address to support multi-address configs)
  const vault = lc(event.log.address);
  const totalAssets = await context.client.readContract({
    abi: context.contracts.VeyraVault.abi,
    address: vault,
    functionName: "totalAssets",
  });
  const totalSupply = await context.client.readContract({
    abi: context.contracts.VeyraVault.abi,
    address: vault,
    functionName: "totalSupply",
  });

  const sharePrice = calculateSharePrice(totalAssets, totalSupply);

  await context.db
    .insert(vaultMetrics)
    .values({
      id: vault,
      totalAssets,
      totalSupply,
      sharePrice,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate(() => ({
      totalAssets,
      totalSupply,
      sharePrice,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
    }));
}
