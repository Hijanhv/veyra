import { onchainTable } from "ponder";

// Vault metrics table
export const vaultMetrics = onchainTable("vault_metrics", (t) => ({
  id: t.text().primaryKey(), // vault address
  totalAssets: t.bigint().notNull(),
  totalSupply: t.bigint().notNull(),
  sharePrice: t.bigint().notNull(), // in wei, calculated as totalAssets / totalSupply
  updatedAt: t.bigint().notNull(), // block timestamp
  blockNumber: t.bigint().notNull(),
}));

// Deposit events
export const deposits = onchainTable("deposits", (t) => ({
  id: t.text().primaryKey(), // transaction hash + log index
  sender: t.hex().notNull(),
  owner: t.hex().notNull(),
  assets: t.bigint().notNull(),
  shares: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

// Withdrawal events
export const withdrawals = onchainTable("withdrawals", (t) => ({
  id: t.text().primaryKey(), // transaction hash + log index
  sender: t.hex().notNull(),
  receiver: t.hex().notNull(),
  owner: t.hex().notNull(),
  assets: t.bigint().notNull(),
  shares: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

// Strategy events
export const strategyEvents = onchainTable("strategy_events", (t) => ({
  id: t.text().primaryKey(), // transaction hash + log index
  strategy: t.hex().notNull(),
  eventType: t.text().notNull(), // "deposit", "withdrawal", "allocation_updated", "harvested"
  amount: t.bigint(), // nullable for allocation updates
  allocation: t.bigint(), // nullable for deposits/withdrawals
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

// Rebalance events
export const rebalances = onchainTable("rebalances", (t) => ({
  id: t.text().primaryKey(), // transaction hash + log index
  strategies: t.text().array().notNull(), // array of strategy addresses as strings
  allocations: t.bigint().array().notNull(), // array of allocation amounts
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

// User balances (track individual user positions)
export const userBalances = onchainTable("user_balances", (t) => ({
  id: t.text().primaryKey(), // user address + vault address
  user: t.hex().notNull(),
  vault: t.hex().notNull(),
  shares: t.bigint().notNull(),
  updatedAt: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
}));

// Yield harvesting events
export const yieldHarvests = onchainTable("yield_harvests", (t) => ({
  id: t.text().primaryKey(), // transaction hash + log index
  totalYield: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));