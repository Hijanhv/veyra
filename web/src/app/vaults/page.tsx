'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useVaultMetricsQuery,
  useStrategyRecommendationQuery,
  useAIRebalanceQuery,
  useStrategyDetailsQuery,
} from '@/queries/vaults'
import { useVaultFlowsQuery, useVaultRebalancesQuery } from '@/queries/analytics'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useVault } from '@/context/VaultContext'
import VaultToolbar from '@/components/vault/VaultToolbar'
import type { VaultMetrics, RebalanceRecommendation, StrategyDetails, VaultFlowItem, VaultRebalanceItem } from '@/types/api'

export default function VaultsPage() {
  const { selectedVaultId } = useVault()

  const metricsQ = useVaultMetricsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const strategyQ = useStrategyRecommendationQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const rebalanceQ = useAIRebalanceQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const detailsQ = useStrategyDetailsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const flowsQ = useVaultFlowsQuery(selectedVaultId || undefined, 25, 0, { enabled: !!selectedVaultId })
  const rebalancesQ = useVaultRebalancesQuery(selectedVaultId || undefined, 25, 0, { enabled: !!selectedVaultId })


  const metrics: VaultMetrics | undefined = metricsQ.data && metricsQ.data.success ? metricsQ.data.data : undefined
  const strategyRec = strategyQ.data && strategyQ.data.success ? strategyQ.data.data : null
  const rebalance: RebalanceRecommendation | undefined = rebalanceQ.data && rebalanceQ.data.success ? rebalanceQ.data.data : undefined
  const details: StrategyDetails[] | undefined = detailsQ.data && detailsQ.data.success ? detailsQ.data.data : undefined
  const error = (metricsQ.data && !metricsQ.data.success && metricsQ.data.error)
    || (strategyQ.data && !strategyQ.data.success && strategyQ.data.error)
    || (rebalanceQ.data && !rebalanceQ.data.success && rebalanceQ.data.error)
    || (detailsQ.data && !detailsQ.data.success && detailsQ.data.error)
    || (metricsQ.error instanceof Error ? metricsQ.error.message : undefined)
    || (strategyQ.error instanceof Error ? strategyQ.error.message : undefined)
    || (rebalanceQ.error instanceof Error ? rebalanceQ.error.message : undefined)
    || (detailsQ.error instanceof Error ? detailsQ.error.message : undefined)
    || (flowsQ.error instanceof Error ? flowsQ.error.message : undefined)
    || (rebalancesQ.error instanceof Error ? rebalancesQ.error.message : undefined)

  return (
    <div className="min-h-screen">
      <div className="site-container max-w-6xl py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Vaults</h1>
          <p className="text-sm text-foreground/70">Metrics, strategy, and AI rebalancing</p>
        </div>
        <div className="mb-8">
          <VaultToolbar />
        </div>

        {error && <div className="mb-6 text-sm text-rose-400">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {!metrics ? (
                <div className="text-foreground/70 text-sm">No data.</div>
              ) : (
                <div className="space-y-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          dataKey="value"
                          data={Object.entries(metrics.strategyAllocation || {}).map(([addr, bp]) => ({
                            name: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
                            value: Number(bp) / 100,
                          }))}
                          label
                        >
                          {Object.entries(metrics.strategyAllocation || {}).map((_, i) => (
                            <Cell key={i} fill={["#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#fb7185"][i % 6]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify(metrics, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Strategy Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              {!strategyRec ? <div className="text-foreground/70 text-sm">No data.</div> : (
                <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify(strategyRec, null, 2)}</pre>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">AI Rebalance</CardTitle>
            </CardHeader>
            <CardContent>
              {!rebalance ? <div className="text-foreground/70 text-sm">No data.</div> : (
                <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify(rebalance, null, 2)}</pre>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Strategy Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!details ? <div className="text-foreground/70 text-sm">No data.</div> : (
                <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify(details, null, 2)}</pre>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Recent Flows</CardTitle>
            </CardHeader>
            <CardContent>
              {!flowsQ.data || !('success' in flowsQ.data) || !flowsQ.data.success || flowsQ.data.data.items.length === 0 ? (
                <div className="text-foreground/70 text-sm">No flows.</div>
              ) : (
                <ul className="text-xs space-y-2">
                  {flowsQ.data.data.items.slice(0, 10).map((f: VaultFlowItem) => (
                    <li key={f.id} className="text-[var(--foreground)]/90">
                      <span className="uppercase">{f.type}</span> • assets {f.assetsWei} • shares {f.sharesWei} •
                      block {f.blockNumber} • {new Date(f.timestamp * 1000).toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Recent Rebalances</CardTitle>
            </CardHeader>
            <CardContent>
              {!rebalancesQ.data || !('success' in rebalancesQ.data) || !rebalancesQ.data.success || rebalancesQ.data.data.items.length === 0 ? (
                <div className="text-foreground/70 text-sm">No rebalances.</div>
              ) : (
                <ul className="text-xs space-y-2">
                  {rebalancesQ.data.data.items.slice(0, 10).map((r: VaultRebalanceItem) => (
                    <li key={r.id} className="text-[var(--foreground)]/90">
                      {new Date(r.timestamp * 1000).toLocaleString()} • strategies {r.strategies.length}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
