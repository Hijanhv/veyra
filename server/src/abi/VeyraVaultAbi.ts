import type { Abi } from "abitype";

// Minimal ABI required for typed events + reads used by the indexer.
// Includes: Deposit, Withdraw, StrategyDeposit, StrategyWithdrawal,
// StrategyAllocationUpdated, RebalanceExecuted, YieldHarvested, totalAssets, totalSupply
export const VeyraVaultAbi = [
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { name: "sender", type: "address", indexed: true, internalType: "address" },
      { name: "owner", type: "address", indexed: true, internalType: "address" },
      { name: "assets", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "shares", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdraw",
    inputs: [
      { name: "sender", type: "address", indexed: true, internalType: "address" },
      { name: "receiver", type: "address", indexed: true, internalType: "address" },
      { name: "owner", type: "address", indexed: true, internalType: "address" },
      { name: "assets", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "shares", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "StrategyDeposit",
    inputs: [
      { name: "strategy", type: "address", indexed: true, internalType: "address" },
      { name: "assets", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "StrategyWithdrawal",
    inputs: [
      { name: "strategy", type: "address", indexed: true, internalType: "address" },
      { name: "assets", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "StrategyAllocationUpdated",
    inputs: [
      { name: "strategy", type: "address", indexed: true, internalType: "address" },
      { name: "bps", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RebalanceExecuted",
    inputs: [
      { name: "strategies", type: "address[]", indexed: false, internalType: "address[]" },
      { name: "allocations", type: "uint256[]", indexed: false, internalType: "uint256[]" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "YieldHarvested",
    inputs: [
      { name: "totalYield", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "totalAssets",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const satisfies Abi;

export default VeyraVaultAbi;

