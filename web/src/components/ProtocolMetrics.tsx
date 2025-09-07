'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVault } from '@/context/VaultContext'
import { useInsightsQuery } from '@/queries/analytics'
import { useStrategyDetailsQuery, useVaultMetricsQuery } from '@/queries/vaults'
import type { MarketInsights } from '@/types/api'

export function ProtocolMetrics() {
  const { selectedVaultId } = useVault()
  const metricsQ = useVaultMetricsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const detailsQ = useStrategyDetailsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const insightsQ = useInsightsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })

  const allocEntries: Array<{ name: string; value: number }> = (() => {
    if (!metricsQ.data || !('success' in metricsQ.data) || !metricsQ.data.success) return []
    return Object.entries(metricsQ.data.data.strategyAllocation || {}).map(([addr, bp]) => ({
      name: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
      value: Number(bp) / 100,
    }))
  })()

  const underlyingItems: Array<{ label: string; metric: string }> = (() => {
    if (!detailsQ.data || !('success' in detailsQ.data) || !detailsQ.data.success) return []
    const out: Array<{ label: string; metric: string }> = []
    for (const s of detailsQ.data.data) {
      for (const u of s.underlying || []) {
        if ('apr' in u && typeof u.apr === 'number') out.push({ label: `${u.name}`, metric: `${u.apr / 100}% APR` })
        else if ('supplyApy' in u && typeof u.supplyApy === 'number') out.push({ label: `${u.name}`, metric: `${u.supplyApy / 100}% APY` })
        else if ('rate' in u && typeof u.rate === 'number') out.push({ label: `${u.name}`, metric: `Rate ${u.rate.toFixed(2)}` })
      }
    }
    return out.slice(0, 6)
  })()

  const insights: MarketInsights | null = insightsQ.data && insightsQ.data.success ? insightsQ.data.data : null

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)]">Strategy Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          {!allocEntries.length ? (
            <div className="h-16 flex items-center justify-center text-[var(--muted)]">No allocation data.</div>
          ) : (
            <div className="space-y-2">
              {allocEntries.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-[var(--muted)] text-sm">{item.name}</span>
                  <span className="text-[var(--foreground)] font-medium">{item.value.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="backdrop-blur">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)]">Protocol Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!underlyingItems.length ? (
            <div className="text-[var(--muted)] text-sm">No underlying protocol metrics.</div>
          ) : (
            underlyingItems.map((i, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-[var(--card)] flex items-center justify-between">
                <span className="text-[var(--foreground)]/90 text-sm">{i.label}</span>
                <span className="text-[var(--foreground)] text-sm font-medium">{i.metric}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="backdrop-blur">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)]">AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!insights ? (
            <div className="text-[var(--muted)] text-sm">No insights available.</div>
          ) : (
            <>
              {(insights.topOpportunities || []).slice(0, 3).map((o, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-white/10">
                  <p className="text-[var(--foreground)]/85 text-sm">
                    <strong>Opportunity:</strong> {`${o.strategy.slice(0, 6)}…${o.strategy.slice(-4)}`} at {(o.apy ?? 0).toFixed(2)}% — {o.reasoning}
                  </p>
                </div>
              ))}
              {(insights.riskFactors || []).slice(0, 3).map((r: string, idx: number) => (
                <div key={`risk-${idx}`} className="p-3 rounded-lg bg-white/10">
                  <p className="text-[var(--foreground)]/85 text-sm">
                    <strong>Risk:</strong> {r}
                  </p>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
