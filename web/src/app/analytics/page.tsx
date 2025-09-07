'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAgentDecisionsQuery } from '@/queries/analytics'
import { useVault } from '@/context/VaultContext'

export default function AnalyticsPage() {
  const { selectedVaultId } = useVault()
  const decisionsQ = useAgentDecisionsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const error = (decisionsQ.data && !decisionsQ.data.success && decisionsQ.data.error)
    || (decisionsQ.error instanceof Error ? decisionsQ.error.message : undefined)

  return (
    <div className="min-h-screen">
      <div className="site-container max-w-6xl py-10">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Analytics</h1>
            <p className="text-sm text-[var(--muted)]">AI decision history and outcomes</p>
            <p className="text-xs text-[var(--muted)] mt-1">Selected: {selectedVaultId ? `${selectedVaultId.slice(0, 6)}…${selectedVaultId.slice(-4)}` : '—'}</p>
          </div>
        </div>

        {error && <div className="mb-6 text-sm text-rose-300">{error}</div>}

        <div className="grid grid-cols-1 gap-6">
          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">AI Agent Decisions (History)</CardTitle>
            </CardHeader>
            <CardContent>
              {!decisionsQ.data || !('success' in decisionsQ.data) || !decisionsQ.data.success ? (
                <div className="text-[var(--muted)] text-sm">No decisions yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-[var(--muted)]">
                      <tr>
                        <th className="text-left py-2 pr-4">Time</th>
                        <th className="text-left py-2 pr-4">Exp. APY</th>
                        <th className="text-left py-2 pr-4">Risk</th>
                        <th className="text-left py-2 pr-4">Confidence</th>
                        <th className="text-left py-2 pr-4">Reasoning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisionsQ.data.data.map((d) => (
                        <tr key={d.id} className="border-t border-[var(--muted)]/20">
                          <td className="py-2 pr-4 text-[var(--foreground)]">{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{(d.expected_apy_bp / 100).toFixed(2)}%</td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{d.risk_score.toFixed(2)}</td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{d.confidence.toFixed(2)}</td>
                          <td className="py-2 pr-4 text-[var(--muted)]">{d.reasoning || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
