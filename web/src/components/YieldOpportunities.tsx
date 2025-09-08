'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink } from 'lucide-react'
import { useAgentDecisionsQuery } from '@/queries/analytics'
import { useStrategyDetailsQuery } from '@/queries/vaults'
import { useVault } from '@/context/VaultContext'
import { sonicscanAddressUrl } from '@/lib/explorer'

export function YieldOpportunities() {
  const { selectedVaultId } = useVault()
  const decisionsQ = useAgentDecisionsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const detailsQ = useStrategyDetailsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const loading = decisionsQ.isLoading
  const latest = decisionsQ.data && decisionsQ.data.success && decisionsQ.data.data.length
    ? decisionsQ.data.data[0]
    : null
  const allocations = latest ? Object.entries(latest.allocations_json || {}).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 3) : []
  const nameMap: Record<string, string> = (detailsQ.data && detailsQ.data.success
    ? Object.fromEntries(
      (detailsQ.data.data || []).map((d) => [d.strategyAddress.toLowerCase(), d.strategyName || d.strategyAddress])
    )
    : {})

  return (
    <Card className="backdrop-blur">
      <CardHeader>
        <CardTitle className="text-[var(--foreground)] flex items-center gap-2">
          Veyra Strategy Opportunities
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
          <div className="text-foreground/70 text-sm">No strategy opportunities available.</div>
        ) : (
          <div className="space-y-4">
            {allocations.map(([addr], index) => (
              <div key={index} className="p-4 rounded-lg bg-card transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-[var(--foreground)] font-medium">{nameMap[addr.toLowerCase()] || `${addr.slice(0, 10)}…${addr.slice(-6)}`}</h4>
                  </div>
                  <a
                    href={sonicscanAddressUrl(addr)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/60 hover:text-foreground/80"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-foreground/70 text-xs">APY</p>
                    <p className="text-[var(--foreground)] font-bold">{(Number(latest?.expected_apy_bp || 0) / 100).toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
