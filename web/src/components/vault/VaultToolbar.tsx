'use client'

import VaultSelector from '@/components/vault/VaultSelector'
import { useVault } from '@/context/VaultContext'
import { useReadContract } from 'wagmi'
import VeyraVaultArtifact from '@/abi/VeyraVault.json'
import type { Abi } from 'viem'
import ExplorerLink from '@/components/ExplorerLink'

export default function VaultToolbar() {
  const { selectedVaultId } = useVault()
  const nameQ = useReadContract({
    address: selectedVaultId as `0x${string}` | undefined,
    abi: VeyraVaultArtifact.abi as Abi,
    functionName: 'name',
    query: { enabled: !!selectedVaultId },
  })

  return (
    <div className="w-full border rounded-xl bg-card text-card-foreground px-4 py-3 space-y-4">
      {selectedVaultId && (
        <div className="text-sm text-foreground/70 flex items-center gap-2">
          <span className="font-medium text-foreground">Selected Vault:</span>
          <span className="text-foreground/80">
            {nameQ.data && typeof nameQ.data === 'string' ? nameQ.data : `${selectedVaultId.slice(0, 10)}…${selectedVaultId.slice(-6)}`}
          </span>
          <span className="text-foreground/60">({selectedVaultId.slice(0, 6)}…{selectedVaultId.slice(-4)})</span>
          <ExplorerLink address={selectedVaultId} className="ml-1" />
        </div>
      )}
      <VaultSelector />
    </div>
  )
}
