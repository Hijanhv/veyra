'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink } from 'lucide-react'
import { useInsightsQuery } from '@/queries/analytics'
import { useVault } from '@/context/VaultContext'
import type { MarketInsights } from '@/types/api'

export function YieldOpportunities() {
  const { selectedVaultId } = useVault()
  const insightsQ = useInsightsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const loading = insightsQ.isLoading
  const opportunities: MarketInsights['topOpportunities'] = insightsQ.data && insightsQ.data.success
    ? (insightsQ.data.data.topOpportunities || [])
    : []

  return (
    <Card className="backdrop-blur">
      <CardHeader>
        <CardTitle className="text-[var(--foreground)] flex items-center gap-2">
          AI-Detected Yield Opportunities
          <span className="bg-white/10 text-[var(--foreground)]/80 px-2 py-1 rounded-md text-xs">Live</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-white/5 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : !opportunities.length ? (
          <div className="text-[var(--muted)] text-sm">No opportunities found.</div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp, index) => (
              <div key={index} className="p-4 rounded-lg bg-[var(--card)] shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-[var(--foreground)] font-medium">{opp.strategy.slice(0, 10)}…{opp.strategy.slice(-6)}</h4>
                    <p className="text-[var(--muted)] text-sm">Reason: {opp.reasoning}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-[var(--muted)]" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-[var(--muted)] text-xs">APY</p>
                    <p className="text-[var(--foreground)] font-bold">{(opp.apy ?? 0).toFixed(2)}%</p>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-white/50 h-2 rounded-full" style={{ width: `${Math.min((opp.apy ?? 0) * 5, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
