'use client'

import { useMemo } from 'react'
import { useVault } from '@/context/VaultContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ExplorerLink from '@/components/ExplorerLink'
import VeyraVaultArtifact from '@/abi/VeyraVault.json'
import type { Abi } from 'viem'
import { useReadContracts } from 'wagmi'
import { useQueries } from '@tanstack/react-query'
import { getStrategyDetails } from '@/lib/api'
import type { StrategyDetails } from '@/types/api'

export default function VaultCatalog() {
  const { vaults } = useVault()

  const nameContracts = useMemo(() => vaults.map((address) => ({
    address: address as `0x${string}`,
    abi: VeyraVaultArtifact.abi as Abi,
    functionName: 'name' as const,
  })), [vaults])

  const namesQ = useReadContracts({ contracts: nameContracts, query: { enabled: vaults.length > 0 } })

  const detailsQ = useQueries({
    queries: vaults.map((v) => ({
      queryKey: ['vaults', 'details', v],
      queryFn: () => getStrategyDetails(v).then((r) => (r.success ? r.data : [] as StrategyDetails[])),
      staleTime: 30_000,
      enabled: !!v,
    })),
  })

  const cards = vaults.map((v, i) => {
    const nameRes = namesQ.data?.[i]
    const name = (nameRes && nameRes.status === 'success' && typeof nameRes.result === 'string') ? nameRes.result : undefined
    const detRes = detailsQ[i]
    const strategies: StrategyDetails[] = detRes.data || []
    const components = new Set<string>()
    strategies.forEach((s) => s.underlying.forEach((u) => components.add((u).label || u.name)))
    return { address: v, name, strategies, components: Array.from(components) }
  })

  if (!vaults.length) {
    return <div className="text-sm text-foreground/70">No vaults configured.</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((c) => (
        <Card key={c.address} className="backdrop-blur">
          <CardHeader>
            <CardTitle className="text-[var(--foreground)] text-base">
              {c.name || `${c.address.slice(0, 8)}…${c.address.slice(-6)}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-foreground/70">
              <span className="text-foreground/60">Address:</span>{' '}
              <span className="text-foreground/80">{c.address.slice(0, 10)}…{c.address.slice(-6)}</span>{' '}
              <ExplorerLink address={c.address} label="Explorer" />
            </div>

            <div className="text-xs text-foreground/70">
              <span className="text-foreground/60">Strategies:</span>{' '}
              <span className="text-foreground/80">{c.strategies.length}</span>
            </div>

            <div className="text-xs text-foreground/70">
              <span className="text-foreground/60">Components:</span>{' '}
              {c.components.length ? (
                <span className="inline-flex flex-wrap gap-1">
                  {c.components.map((k) => (
                    <Badge key={k} variant="outline">{k}</Badge>
                  ))}
                </span>
              ) : (
                <span className="text-foreground/60">—</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
