export const VeyraVaultAbi = [
  // Read-only functions used by the indexer
  {
    type: "function",
    name: "totalAssets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },

  // Events used by the indexer
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { name: "sender", type: "address", internalType: "address", indexed: true },
      { name: "owner", type: "address", internalType: "address", indexed: true },
      { name: "assets", type: "uint256", internalType: "uint256", indexed: false },
      { name: "shares", type: "uint256", internalType: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdraw",
    inputs: [
      { name: "sender", type: "address", internalType: "address", indexed: true },
      { name: "receiver", type: "address", internalType: "address", indexed: true },
      { name: "owner", type: "address", internalType: "address", indexed: true },
      { name: "assets", type: "uint256", internalType: "uint256", indexed: false },
      { name: "shares", type: "uint256", internalType: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "StrategyDeposit",
    inputs: [
      { name: "strategy", type: "address", internalType: "address", indexed: true },
      { name: "assets", type: "uint256", internalType: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "StrategyWithdrawal",
    inputs: [
      { name: "strategy", type: "address", internalType: "address", indexed: true },
      { name: "assets", type: "uint256", internalType: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "StrategyAllocationUpdated",
    inputs: [
      { name: "strategy", type: "address", internalType: "address", indexed: true },
      { name: "bps", type: "uint256", internalType: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RebalanceExecuted",
    inputs: [
      { name: "strategies", type: "address[]", internalType: "address[]", indexed: false },
      { name: "allocations", type: "uint256[]", internalType: "uint256[]", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "YieldHarvested",
    inputs: [
      { name: "totalYield", type: "uint256", internalType: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export default VeyraVaultAbi;

