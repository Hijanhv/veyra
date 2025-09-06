'use client'

import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVaultOverview, useVaultFlows, useAllocHistory, useHarvests, useAgentDecisions, usePositions } from '@/queries/vaults'

function fmtPct(bp?: number) { return typeof bp === 'number' ? (bp/100).toFixed(2) + '%' : '—' }
function fmtNum(n?: number) { return typeof n === 'number' ? n.toLocaleString() : '—' }

export default function VaultPage() {
  const params = useParams<{ id: string }>()
  const vaultId = params?.id as string

  const overviewQ = useVaultOverview(vaultId, { enabled: !!vaultId })
  const flowsQ = useVaultFlows(vaultId, { enabled: !!vaultId })
  const historyQ = useAllocHistory(vaultId, { enabled: !!vaultId })
  const harvestsQ = useHarvests(vaultId, { enabled: !!vaultId })
  const decisionsQ = useAgentDecisions(vaultId, { enabled: !!vaultId })
  const positionsQ = usePositions(vaultId, { enabled: !!vaultId })

  const overview = (overviewQ.data as any)?.data
  const flows = (flowsQ.data as any)?.data || []
  const history = (historyQ.data as any)?.data || []
  const harvests = (harvestsQ.data as any)?.data || []
  const decisions = (decisionsQ.data as any)?.data || []
  const positions = (positionsQ.data as any)?.data || {}

  const allocList = useMemo(() => {
    const allocs = overview?.latestAllocations || {}
    return Object.entries(allocs as Record<string, number>)
      .sort((a,b)=>b[1]-a[1])
  }, [overview])

  return (
    <div className="min-h-screen">
      <div className="site-container max-w-7xl py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Vault {vaultId?.slice(0,10)}…</h1>
          <p className="text-sm text-[var(--muted)]">Live overview of allocations, flows, and AI decisions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="backdrop-blur">
            <CardHeader><CardTitle className="text-[var(--foreground)]">Overview</CardTitle></CardHeader>
            <CardContent className="text-sm text-[var(--foreground)]/90 space-y-1">
              <div>Total Assets: {fmtNum(overview?.totalAssets)}</div>
              <div>Current APY: {fmtPct(overview?.currentApy)}</div>
              <div>Strategies: {Object.keys(overview?.strategyAllocation || {}).length || '—'}</div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur lg:col-span-2">
            <CardHeader><CardTitle className="text-[var(--foreground)]">Allocations</CardTitle></CardHeader>
            <CardContent>
              {allocList.length === 0 ? (
                <div className="text-sm text-[var(--muted)]">No allocation data</div>
              ) : (
                <div className="text-xs grid grid-cols-1 md:grid-cols-2 gap-2">
                  {allocList.map(([addr, bp]) => (
                    <div key={addr} className="flex justify-between gap-3">
                      <span className="truncate">{addr}</span>
                      <span>{(bp/100).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="backdrop-blur lg:col-span-2">
            <CardHeader><CardTitle className="text-[var(--foreground)]">Activity</CardTitle></CardHeader>
            <CardContent>
              {flows.length === 0 ? (
                <div className="text-sm text-[var(--muted)]">No flows indexed yet.</div>
              ) : (
                <div className="text-xs space-y-1 text-[var(--foreground)]/90">
                  {flows.slice(0,50).map((f:any)=> (
                    <div key={`${f.tx_hash}-${f.log_index}`} className="flex gap-2">
                      <span className="text-[var(--muted)]">{new Date(f.ts).toLocaleString()}</span>
                      <span className="uppercase font-medium">{f.action}</span>
                      <span>strategy:</span>
                      <span className="truncate max-w-[240px]">{f.strategy_address}</span>
                      <span>amount:</span>
                      <span>{f.amount_wei}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader><CardTitle className="text-[var(--foreground)]">Positions</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(positions).length === 0 ? (
                <div className="text-sm text-[var(--muted)]">No positions yet.</div>
              ) : (
                <div className="text-xs space-y-1 text-[var(--foreground)]/90">
                  {Object.entries(positions as Record<string, number>).map(([addr, amt]) => (
                    <div key={addr} className="flex justify-between gap-2">
                      <span className="truncate max-w-[240px]">{addr}</span>
                      <span>{amt}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="backdrop-blur">
            <CardHeader><CardTitle className="text-[var(--foreground)]">AI Decisions</CardTitle></CardHeader>
            <CardContent>
              {decisions.length === 0 ? (
                <div className="text-sm text-[var(--muted)]">No decisions yet.</div>
              ) : (
                <div className="text-xs space-y-3 text-[var(--foreground)]/90">
                  {decisions.map((d:any)=> (
                    <div key={d.id}>
                      <div className="flex justify-between text-[var(--muted)]"><span>{new Date(d.created_at).toLocaleString()}</span><span>conf: {Number(d.confidence).toFixed(2)}</span></div>
                      <div>expected APY: {(Number(d.expected_apy_bp)/100).toFixed(2)}%</div>
                      <div className="truncate">alloc: {JSON.stringify(d.allocations_json)}</div>
                      <div className="opacity-80 whitespace-pre-wrap">{d.reasoning}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader><CardTitle className="text-[var(--foreground)]">Harvests</CardTitle></CardHeader>
            <CardContent>
              {harvests.length === 0 ? (
                <div className="text-sm text-[var(--muted)]">No harvests yet.</div>
              ) : (
                <div className="text-xs space-y-1 text-[var(--foreground)]/90">
                  {harvests.map((h:any)=> (
                    <div key={`${h.tx_hash}-${h.log_index}`} className="flex justify-between">
                      <span className="text-[var(--muted)]">{new Date(h.ts).toLocaleString()}</span>
                      <span>{h.total_yield_wei}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

