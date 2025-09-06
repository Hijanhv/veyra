export const qk = {
  health: ['health'] as const,
  scheduler: {
    status: ['scheduler', 'status'] as const,
  },
  analytics: {
    insights: (vaultId: string) => ['analytics', 'insights', vaultId] as const,
    predictions: (vaultId: string) => ['analytics', 'predictions', vaultId] as const,
  },
  vaults: {
    metrics: (vaultId: string) => ['vaults', vaultId, 'metrics'] as const,
    strategy: (vaultId: string) => ['vaults', vaultId, 'strategy'] as const,
    aiRebalance: (vaultId: string) => ['vaults', vaultId, 'ai-rebalance'] as const,
    details: (vaultId: string) => ['vaults', vaultId, 'strategies', 'analysis'] as const,
    overview: (vaultId: string) => ['vaults', vaultId, 'overview'] as const,
    flows: (vaultId: string) => ['vaults', vaultId, 'flows'] as const,
    allocHistory: (vaultId: string) => ['vaults', vaultId, 'allocations', 'history'] as const,
    harvests: (vaultId: string) => ['vaults', vaultId, 'harvests'] as const,
    agentDecisions: (vaultId: string) => ['vaults', vaultId, 'agent', 'decisions'] as const,
    positions: (vaultId: string) => ['vaults', vaultId, 'positions'] as const,
  },
} as const
