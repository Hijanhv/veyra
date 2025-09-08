'use client'

import type { StrategyDetails, UnderlyingProtocol } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ExplorerLink from '@/components/ExplorerLink'

function ProtoBadge({ p }: { p: UnderlyingProtocol }) {
  const kind = p.name
  const label = p.label
  switch (kind) {
    case 'Lending':
    case 'Eggs':
      return (
        <Badge variant="outline">
          {(label || kind)} • Supply {('supplyApy' in p && p.supplyApy) ? (p.supplyApy / 100).toFixed(2) : 0}% • Borrow {('borrowApy' in p && p.borrowApy) ? (p.borrowApy / 100).toFixed(2) : 0}%
          {('healthFactor' in p && p.healthFactor) ? ` • HF ${(p.healthFactor as number).toFixed(2)}` : ''}
        </Badge>
      )
    case 'Rings':
      return <Badge variant="outline">{(label || 'Rings')} • APR {('apr' in p && p.apr) ? (p.apr / 100).toFixed(2) : 0}%</Badge>
    case 'StS':
      return <Badge variant="outline">{(label || 'StS')} • Rate {('rate' in p && p.rate) ? p.rate.toFixed(2) : 0}</Badge>
    case 'Beets':
    case 'SwapX':
    case 'Shadow':
    case 'Dex':
      return (
        <Badge variant="outline">
          {(label || kind)} • APR {('apr' in p && p.apr) ? (p.apr / 100).toFixed(2) : 0}%
        </Badge>
      )
    case 'Pendle':
      return <Badge variant="outline">{label || 'Pendle'}</Badge>
    default:
      return <Badge variant="outline">{label || kind}</Badge>
  }
}

export default function StrategyList({ strategies }: { strategies: StrategyDetails[] }) {
  console.log(strategies)
  if (!strategies?.length) return <div className="text-sm text-foreground/70">No strategies found.</div>
  return (
    <div className="space-y-4">
      {strategies.map((s) => (
        <Card key={s.strategyAddress} className="backdrop-blur">
          <CardHeader className="py-3">
            <CardTitle className="text-[var(--foreground)] text-sm flex items-center gap-2">
              <span>{s.strategyName || `${s.strategyAddress.slice(0, 8)}…${s.strategyAddress.slice(-6)}`}</span>
              <ExplorerLink address={s.strategyAddress} label="Explorer" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-foreground/70">
              APY: <span className="text-foreground/90">{(s.apy / 100).toFixed(2)}%</span>
              <span className="ml-3">Total Assets: <span className="text-foreground/90">{s.totalAssets.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span></span>
            </div>
            <div className="flex flex-wrap gap-1">
              {s.underlying.map((p, idx) => <ProtoBadge key={idx} p={p} />)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
