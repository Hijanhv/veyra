'use client'

import VaultSelector from '@/components/vault/VaultSelector'
import { useVault } from '@/context/VaultContext'

export default function VaultToolbar() {
  const { selectedVaultId } = useVault()

  return (
    <div className="w-full border rounded-xl bg-card text-card-foreground px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="text-sm text-foreground/70">
        <span className="font-medium text-foreground">Vault:</span>{' '}
        {selectedVaultId ? (
          <span className="text-foreground/80">{selectedVaultId.slice(0, 10)}…{selectedVaultId.slice(-6)}</span>
        ) : (
          <span className="text-foreground/60">None selected</span>
        )}
      </div>
      <div className="ml-auto">
        <VaultSelector />
      </div>
    </div>
  )
}

