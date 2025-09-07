'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useVaultMetricsQuery,
  useStrategyRecommendationQuery,
  useAIRebalanceQuery,
  useStrategyDetailsQuery,
} from '@/queries/vaults'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useVault } from '@/context/VaultContext'
import type { VaultMetrics, RecommendedAllocation, RebalanceRecommendation, StrategyDetails } from '@/types/api'

export default function VaultsPage() {
  const { selectedVaultId } = useVault()

  const metricsQ = useVaultMetricsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const strategyQ = useStrategyRecommendationQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const rebalanceQ = useAIRebalanceQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const detailsQ = useStrategyDetailsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })


  const loading = metricsQ.isLoading || strategyQ.isLoading || rebalanceQ.isLoading || detailsQ.isLoading
  const metrics: VaultMetrics | undefined = metricsQ.data && metricsQ.data.success ? metricsQ.data.data : undefined
  const strategyRec: RecommendedAllocation | undefined = strategyQ.data && strategyQ.data.success ? strategyQ.data.data : undefined
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

  return (
    <div className="min-h-screen">
      <div className="site-container max-w-6xl py-10">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Vaults</h1>
            <p className="text-sm text-[var(--muted)]">Metrics, strategy, and AI rebalancing</p>
            <p className="text-xs text-[var(--muted)] mt-1">Selected: {selectedVaultId ? `${selectedVaultId.slice(0, 6)}…${selectedVaultId.slice(-4)}` : '—'}</p>
          </div>
        </div>

        {error && <div className="mb-6 text-sm text-rose-300">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {!metrics ? (
                <div className="text-[var(--muted)] text-sm">No data.</div>
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
              {!strategyRec ? <div className="text-[var(--muted)] text-sm">No data.</div> : (
                <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify(strategyRec, null, 2)}</pre>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">AI Rebalance</CardTitle>
            </CardHeader>
            <CardContent>
              {!rebalance ? <div className="text-[var(--muted)] text-sm">No data.</div> : (
                <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify(rebalance, null, 2)}</pre>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Strategy Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!details ? <div className="text-[var(--muted)] text-sm">No data.</div> : (
                <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify(details, null, 2)}</pre>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
