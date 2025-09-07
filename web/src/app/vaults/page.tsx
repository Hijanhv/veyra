'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  useVaultMetricsQuery,
  useStrategyRecommendationQuery,
  useAIRebalanceQuery,
  useStrategyDetailsQuery,
  useExecuteRebalanceMutation,
} from '@/queries/vaults'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

export default function VaultsPage() {
  const [vaultId, setVaultId] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_VAULT_ID || '')
  const [submitted, setSubmitted] = useState<string | null>(vaultId || null)

  const metricsQ = useVaultMetricsQuery(submitted || undefined, { enabled: !!submitted })
  const strategyQ = useStrategyRecommendationQuery(submitted || undefined, { enabled: !!submitted })
  const rebalanceQ = useAIRebalanceQuery(submitted || undefined, { enabled: !!submitted })
  const detailsQ = useStrategyDetailsQuery(submitted || undefined, { enabled: !!submitted })

  const execRebalance = useExecuteRebalanceMutation()

  const loading = metricsQ.isLoading || strategyQ.isLoading || rebalanceQ.isLoading || detailsQ.isLoading
  const error = (metricsQ.data && 'success' in metricsQ.data && !metricsQ.data.success && (metricsQ.data as any).error)
    || (strategyQ.data && 'success' in strategyQ.data && !strategyQ.data.success && (strategyQ.data as any).error)
    || (rebalanceQ.data && 'success' in rebalanceQ.data && !rebalanceQ.data.success && (rebalanceQ.data as any).error)
    || (detailsQ.data && 'success' in detailsQ.data && !detailsQ.data.success && (detailsQ.data as any).error)
    || (metricsQ.error as any)?.message
    || (strategyQ.error as any)?.message
    || (rebalanceQ.error as any)?.message
    || (detailsQ.error as any)?.message

  return (
    <div className="min-h-screen">
      <div className="site-container max-w-6xl py-10">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Vaults</h1>
            <p className="text-sm text-[var(--muted)]">Metrics, strategy, and AI rebalancing</p>
          </div>
          <div className="flex gap-2">
            <Input value={vaultId} onChange={e => setVaultId(e.target.value)} placeholder="Vault address" className="min-w-[360px]" />
            <Button onClick={() => setSubmitted(vaultId)} disabled={!vaultId || loading}>
              {loading ? 'Loading…' : 'Load'}
            </Button>
          </div>
        </div>

        {error && <div className="mb-6 text-sm text-rose-300">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {!metricsQ.data || ('success' in metricsQ.data && !metricsQ.data.success) ? (
                <div className="text-[var(--muted)] text-sm">No data.</div>
              ) : (
                <div className="space-y-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          dataKey="value"
                          data={Object.entries((metricsQ.data as any).data.strategyAllocation || {}).map(([addr, bp]: any) => ({
                            name: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
                            value: Number(bp) / 100,
                          }))}
                          label
                        >
                          {Object.entries((metricsQ.data as any).data.strategyAllocation || {}).map((_, i) => (
                            <Cell key={i} fill={["#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#fb7185"][i % 6]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify((metricsQ.data as any).data, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Strategy Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              {!strategyQ.data || ('success' in strategyQ.data && !strategyQ.data.success) ? <div className="text-[var(--muted)] text-sm">No data.</div> : (
                <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify((strategyQ.data as any).data, null, 2)}</pre>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[var(--foreground)]">AI Rebalance</CardTitle>
              <Button variant="outline" onClick={() => submitted && execRebalance.mutate(submitted)} disabled={!submitted || execRebalance.isPending}>
                {execRebalance.isPending ? 'Executing…' : 'Execute'}
              </Button>
            </CardHeader>
            <CardContent>
              {!rebalanceQ.data || ('success' in rebalanceQ.data && !rebalanceQ.data.success) ? <div className="text-[var(--muted)] text-sm">No data.</div> : (
                <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify((rebalanceQ.data as any).data, null, 2)}</pre>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Strategy Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!detailsQ.data || ('success' in detailsQ.data && !detailsQ.data.success) ? <div className="text-[var(--muted)] text-sm">No data.</div> : (
                <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify((detailsQ.data as any).data, null, 2)}</pre>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
