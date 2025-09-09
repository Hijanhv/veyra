'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAgentDecisionsQuery, useStrategyEventsQuery, useVaultFlowsQuery, useVaultRebalancesQuery, useVaultHarvestsQuery } from '@/queries/analytics'
import { useVault } from '@/context/VaultContext'
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@/components/ui/pagination'
import VaultToolbar from '@/components/vault/VaultToolbar'
import ExplorerLink from '@/components/ExplorerLink'
import ReactMarkdown from 'react-markdown'
import { format } from 'date-fns'

export default function AnalyticsPage() {
  const { selectedVaultId } = useVault()
  const vault = selectedVaultId || undefined

  const decisionsQ = useAgentDecisionsQuery(vault, { enabled: !!vault })

  // Strategy events state and query
  const PAGE_SIZE = 25
  const [eventType, setEventType] = useState<'deposit' | 'withdrawal' | 'allocation_updated' | undefined>(undefined)
  const [eventsOffset, setEventsOffset] = useState(0)
  const eventsQ = useStrategyEventsQuery(vault, { type: eventType, limit: PAGE_SIZE, offset: eventsOffset }, { enabled: !!vault })
  const eventsData = (eventsQ.data && 'success' in eventsQ.data && eventsQ.data.success) ? eventsQ.data.data : null

  // Other Ponder-backed feeds
  const [flowsOffset, setFlowsOffset] = useState(0)
  const [rebalancesOffset, setRebalancesOffset] = useState(0)
  const [harvestsOffset, setHarvestsOffset] = useState(0)
  const flowsQ = useVaultFlowsQuery(vault, PAGE_SIZE, flowsOffset, { enabled: !!vault })
  const rebalancesQ = useVaultRebalancesQuery(vault, PAGE_SIZE, rebalancesOffset, { enabled: !!vault })
  const harvestsQ = useVaultHarvestsQuery(vault, PAGE_SIZE, harvestsOffset, { enabled: !!vault })
  const flowsData = (flowsQ.data && 'success' in flowsQ.data && flowsQ.data.success) ? flowsQ.data.data : null
  const rebalancesData = (rebalancesQ.data && 'success' in rebalancesQ.data && rebalancesQ.data.success) ? rebalancesQ.data.data : null
  const harvestsData = (harvestsQ.data && 'success' in harvestsQ.data && harvestsQ.data.success) ? harvestsQ.data.data : null

  const Pager = ({ offset, setOffset, hasMore, nextOffset }: { offset: number; setOffset: (n: number) => void; hasMore?: boolean; nextOffset?: number }) => {
    const page = Math.floor(offset / PAGE_SIZE) + 1
    return (
      <Pagination className="mt-2">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setOffset(Math.max(0, offset - PAGE_SIZE)) }} aria-disabled={offset === 0} />
          </PaginationItem>
          <PaginationItem>
            <span className="text-xs text-foreground/60 px-2">Page {page}</span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setOffset(nextOffset ?? offset + PAGE_SIZE) }} aria-disabled={!hasMore} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  const error = useMemo(() => (
    (decisionsQ.data && !decisionsQ.data.success && decisionsQ.data.error)
    || (eventsQ.data && !eventsQ.data.success && eventsQ.data.error)
    || (flowsQ.data && !flowsQ.data.success && flowsQ.data.error)
    || (rebalancesQ.data && !rebalancesQ.data.success && rebalancesQ.data.error)
    || (harvestsQ.data && !harvestsQ.data.success && harvestsQ.data.error)
    || (decisionsQ.error instanceof Error ? decisionsQ.error.message : undefined)
    || (eventsQ.error instanceof Error ? eventsQ.error.message : undefined)
    || (flowsQ.error instanceof Error ? flowsQ.error.message : undefined)
    || (rebalancesQ.error instanceof Error ? rebalancesQ.error.message : undefined)
    || (harvestsQ.error instanceof Error ? harvestsQ.error.message : undefined)
  ), [decisionsQ, eventsQ, flowsQ, rebalancesQ, harvestsQ])

  return (
    <div className="min-h-screen">
      <div className="site-container max-w-6xl py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-sm text-foreground/70">AI decisions and indexed on-chain activity</p>
        </div>
        <div className="mb-8">
          <VaultToolbar />
        </div>

        {error && <div className="mb-6 text-sm text-rose-400">{error}</div>}

        <div className="grid grid-cols-1 gap-6">
          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">AI Agent Decisions (History)</CardTitle>
            </CardHeader>
            <CardContent>
              {!decisionsQ.data || !('success' in decisionsQ.data) || !decisionsQ.data.success ? (
                <div className="text-foreground/70 text-sm">No decisions yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-foreground/70">
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
                        <tr key={d.id} className="border-t border-[var(--border)]">
                          <td className="py-2 pr-4 text-[var(--foreground)]">
                            {d.created_at ? (
                              <div className="flex flex-col">
                                <span>{format(new Date(d.created_at), 'MMM d, yyyy')}</span>
                                <span className="text-xs text-foreground/60">{format(new Date(d.created_at), 'h:mm a')}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{(d.expected_apy_bp / 100).toFixed(2)}%</td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{d.risk_score.toFixed(2)}</td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{d.confidence.toFixed(2)}</td>
                          <td className="py-2 pr-4 text-foreground/70">
                            {d.reasoning ? (
                              <div className="prose prose-sm prose-invert max-w-none text-foreground/70">
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => <span>{children}</span>,
                                    code: ({ children }) => <code className="bg-gray-800 px-1 py-0.5 rounded text-xs">{children}</code>,
                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                    em: ({ children }) => <em className="italic">{children}</em>
                                  }}
                                >
                                  {d.reasoning}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Strategy Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs text-foreground/70">Filter</label>
                <select
                  value={eventType || ''}
                  onChange={(e) => {
                    setEventsOffset(0)
                    setEventType((e.target.value || undefined) as 'deposit' | 'withdrawal' | 'allocation_updated' | undefined)
                  }}
                  className="text-sm bg-transparent border border-[var(--border)] rounded px-2 py-1 text-foreground"
                >
                  <option value="">All</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="allocation_updated">Alloc updates</option>
                </select>
                <div className="ml-auto">
                  <Pager offset={eventsOffset} setOffset={setEventsOffset} hasMore={eventsData?.hasMore} nextOffset={eventsData?.nextOffset} />
                </div>
              </div>
              {!eventsData || eventsData.items.length === 0 ? (
                <div className="text-foreground/70 text-sm">No events.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-foreground/70">
                      <tr>
                        <th className="text-left py-2 pr-4">Time</th>
                        <th className="text-left py-2 pr-4">Type</th>
                        <th className="text-left py-2 pr-4">Strategy</th>
                        <th className="text-left py-2 pr-4">Amount</th>
                        <th className="text-left py-2 pr-4">Allocation</th>
                        <th className="text-left py-2 pr-4">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventsData.items.map((e) => (
                        <tr key={e.id} className="border-t border-[var(--border)]">
                          <td className="py-2 pr-4 text-[var(--foreground)]">
                            <div className="flex flex-col">
                              <span>{format(new Date(e.timestamp * 1000), 'MMM d, yyyy')}</span>
                              <span className="text-xs text-foreground/60">{format(new Date(e.timestamp * 1000), 'h:mm a')}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{e.eventType}</td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">
                            <ExplorerLink address={e.strategy} label={`${e.strategy.slice(0, 6)}…${e.strategy.slice(-4)}`} />
                          </td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{e.amount ?? '—'}</td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{e.allocation ?? '—'}</td>
                          <td className="py-2 pr-4 text-foreground/70">
                            <ExplorerLink tx={e.txHash} label={`${e.txHash.slice(0, 10)}…`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Vault Flows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <div className="ml-auto">
                  <Pager offset={flowsOffset} setOffset={setFlowsOffset} hasMore={flowsData?.hasMore} nextOffset={flowsData?.nextOffset} />
                </div>
              </div>
              {!flowsData || flowsData.items.length === 0 ? (
                <div className="text-foreground/70 text-sm">No flows.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-foreground/70">
                      <tr>
                        <th className="text-left py-2 pr-4">Time</th>
                        <th className="text-left py-2 pr-4">Type</th>
                        <th className="text-left py-2 pr-4">Assets</th>
                        <th className="text-left py-2 pr-4">Shares</th>
                        <th className="text-left py-2 pr-4">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flowsData.items.map((f) => (
                        <tr key={f.id} className="border-t border-[var(--border)]">
                          <td className="py-2 pr-4 text-[var(--foreground)]">
                            <div className="flex flex-col">
                              <span>{format(new Date(f.timestamp * 1000), 'MMM d, yyyy')}</span>
                              <span className="text-xs text-foreground/60">{format(new Date(f.timestamp * 1000), 'h:mm a')}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{f.type}</td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{f.assetsWei}</td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{f.sharesWei}</td>
                          <td className="py-2 pr-4 text-foreground/70">
                            <ExplorerLink tx={f.txHash} label={`${f.txHash.slice(0, 10)}…`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Rebalances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <div className="ml-auto">
                  <Pager offset={rebalancesOffset} setOffset={setRebalancesOffset} hasMore={rebalancesData?.hasMore} nextOffset={rebalancesData?.nextOffset} />
                </div>
              </div>
              {!rebalancesData || rebalancesData.items.length === 0 ? (
                <div className="text-foreground/70 text-sm">No rebalances.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-foreground/70">
                      <tr>
                        <th className="text-left py-2 pr-4">Time</th>
                        <th className="text-left py-2 pr-4">Strategies</th>
                        <th className="text-left py-2 pr-4">Allocations (bps)</th>
                        <th className="text-left py-2 pr-4">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rebalancesData.items.map((r) => (
                        <tr key={r.id} className="border-t border-[var(--border)]">
                          <td className="py-2 pr-4 text-[var(--foreground)]">
                            <div className="flex flex-col">
                              <span>{format(new Date(r.timestamp * 1000), 'MMM d, yyyy')}</span>
                              <span className="text-xs text-foreground/60">{format(new Date(r.timestamp * 1000), 'h:mm a')}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{r.strategies.length}</td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{r.allocations.join(', ')}</td>
                          <td className="py-2 pr-4 text-foreground/70">
                            <ExplorerLink tx={r.txHash} label={`${r.txHash.slice(0, 10)}…`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Yield Harvests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <div className="ml-auto">
                  <Pager offset={harvestsOffset} setOffset={setHarvestsOffset} hasMore={harvestsData?.hasMore} nextOffset={harvestsData?.nextOffset} />
                </div>
              </div>
              {!harvestsData || harvestsData.items.length === 0 ? (
                <div className="text-foreground/70 text-sm">No harvests.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-foreground/70">
                      <tr>
                        <th className="text-left py-2 pr-4">Time</th>
                        <th className="text-left py-2 pr-4">Total Yield (wei)</th>
                        <th className="text-left py-2 pr-4">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {harvestsData.items.map((h) => (
                        <tr key={h.id} className="border-t border-[var(--border)]">
                          <td className="py-2 pr-4 text-[var(--foreground)]">
                            <div className="flex flex-col">
                              <span>{format(new Date(h.timestamp * 1000), 'MMM d, yyyy')}</span>
                              <span className="text-xs text-foreground/60">{format(new Date(h.timestamp * 1000), 'h:mm a')}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-[var(--foreground)]">{h.totalYieldWei}</td>
                          <td className="py-2 pr-4 text-foreground/70">
                            <ExplorerLink tx={h.txHash} label={`${h.txHash.slice(0, 10)}…`} />
                          </td>
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
