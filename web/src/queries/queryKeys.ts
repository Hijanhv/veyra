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
    list: ['vaults', 'list'] as const,
    metrics: (vaultId: string) => ['vaults', vaultId, 'metrics'] as const,
    strategy: (vaultId: string) => ['vaults', vaultId, 'strategy'] as const,
    aiRebalance: (vaultId: string) => ['vaults', vaultId, 'ai-rebalance'] as const,
    details: (vaultId: string) => ['vaults', vaultId, 'strategies', 'analysis'] as const,
    overview: (vaultId: string) => ['vaults', vaultId, 'overview'] as const,
    flows: (vaultId: string, limit: number, offset: number) => ['vaults', vaultId, 'flows', limit, offset] as const,
    rebalances: (vaultId: string, limit: number, offset: number) => ['vaults', vaultId, 'rebalances', limit, offset] as const,
    harvests: (vaultId: string, limit: number, offset: number) => ['vaults', vaultId, 'harvests', limit, offset] as const,
  },
} as const
