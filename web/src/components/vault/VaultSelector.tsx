'use client'

import { useVault } from '@/context/VaultContext'

export default function VaultSelector() {
  const { vaults, selectedVaultId, setSelectedVaultId, loading } = useVault()

  if (loading && !vaults.length) {
    return <div className="text-xs text-[var(--muted)]">Loading vaults…</div>
  }
  if (!vaults.length) return null

  return (
    <select
      className="bg-white/10 text-white/90 text-xs rounded px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      value={selectedVaultId ?? ''}
      onChange={(e) => setSelectedVaultId(e.target.value)}
      aria-label="Select vault"
    >
      {vaults.map((v) => (
        <option key={v} value={v} className="bg-black text-white">
          {v.slice(0, 8)}…{v.slice(-6)}
        </option>
      ))}
    </select>
  )
}

