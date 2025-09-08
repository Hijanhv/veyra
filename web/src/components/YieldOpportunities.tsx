'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink } from 'lucide-react'
import { useAgentDecisionsQuery } from '@/queries/analytics'
import { useVault } from '@/context/VaultContext'

export function YieldOpportunities() {
  const { selectedVaultId } = useVault()
  const decisionsQ = useAgentDecisionsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const loading = decisionsQ.isLoading
  const latest = decisionsQ.data && decisionsQ.data.success && decisionsQ.data.data.length
    ? decisionsQ.data.data[0]
    : null
  const allocations = latest ? Object.entries(latest.allocations_json || {}).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 3) : []

  return (
    <Card className="backdrop-blur">
      <CardHeader>
        <CardTitle className="text-[var(--foreground)] flex items-center gap-2">
          AI-Detected Yield Opportunities
          <span className="bg-secondary text-foreground/80 px-2 py-1 rounded-md text-xs">Live</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-secondary/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : !allocations.length ? (
          <div className="text-foreground/70 text-sm">No opportunities found.</div>
        ) : (
          <div className="space-y-4">
            {allocations.map(([addr], index) => (
              <div key={index} className="p-4 rounded-lg bg-card shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-[var(--foreground)] font-medium">{addr.slice(0, 10)}…{addr.slice(-6)}</h4>
                  </div>
                  <ExternalLink className="h-4 w-4 text-foreground/60" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-foreground/70 text-xs">APY</p>
                    <p className="text-[var(--foreground)] font-bold">{(Number(latest?.expected_apy_bp || 0) / 100).toFixed(2)}%</p>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min((Number(latest?.expected_apy_bp || 0) / 100) * 5, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
