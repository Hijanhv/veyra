'use client'

import { useVault } from '@/context/VaultContext'

export default function VaultSelector() {
  const { vaults, selectedVaultId, setSelectedVaultId, loading } = useVault()

  if (loading && !vaults.length) {
    return <div className="text-xs text-foreground/70">Loading vaults…</div>
  }
  if (!vaults.length) return null

  return (
    <select
      className="text-sm bg-transparent border border-[var(--border)] rounded-md px-3 py-2 text-[var(--foreground)] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] focus-visible:border-[var(--ring)]"
      value={selectedVaultId ?? ''}
      onChange={(e) => setSelectedVaultId(e.target.value)}
      aria-label="Select vault"
    >
      {!selectedVaultId && <option value="" disabled>Select a vault…</option>}
      {vaults.map((v) => (
        <option key={v} value={v}>
          {v.slice(0, 8)}…{v.slice(-6)}
        </option>
      ))}
    </select>
  )
}
