'use client'

import { useMemo } from 'react'
import { useVault } from '@/context/VaultContext'
import VeyraVaultArtifact from '@/abi/VeyraVault.json'
import { useReadContracts } from 'wagmi'
import type { Abi } from 'viem'

export default function VaultSelector() {
  const { vaults, selectedVaultId, setSelectedVaultId, loading } = useVault()

  const contracts = useMemo(() => vaults.map((address) => ({
    address: address as `0x${string}`,
    abi: VeyraVaultArtifact.abi as Abi,
    functionName: 'name' as const,
  })), [vaults])

  const namesQ = useReadContracts({
    contracts,
    query: { enabled: vaults.length > 0 },
  })

  const labels = useMemo(() => {
    const out: Record<string, string> = {}
    vaults.forEach((addr, i) => {
      const r = namesQ.data?.[i]
      const name = (r && r.status === 'success' && typeof r.result === 'string') ? r.result : undefined
      out[addr] = name || `${addr.slice(0, 8)}…${addr.slice(-6)}`
    })
    return out
  }, [vaults, namesQ.data])

  if (loading && !vaults.length) {
    return <div className="text-xs text-foreground/70">Loading vaults…</div>
  }
  if (!vaults.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {vaults.map((v) => (
        <button
          key={v}
          onClick={() => setSelectedVaultId(v)}
          className={`px-3 py-2 rounded text-sm ${
            selectedVaultId === v
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground/70 hover:text-foreground'
          }`}
        >
          {labels[v]}
        </button>
      ))}
    </div>
  )
}
