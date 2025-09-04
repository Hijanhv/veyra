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
  },
} as const

