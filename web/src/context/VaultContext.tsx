'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useVaultList } from '@/queries/vaults'
import type { Address } from '@/types/api'

type VaultContextValue = {
  vaults: Address[]
  defaultVaultId: Address | null
  selectedVaultId: Address | null
  setSelectedVaultId: (id: Address) => void
  loading: boolean
  error?: string
}

const VaultContext = createContext<VaultContextValue | undefined>(undefined)

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Address | null>(null)
  const listQ = useVaultList()

  const vaults: Address[] = useMemo(() => {
    if (listQ.data && listQ.data.success) return listQ.data.data.vaults
    return []
  }, [listQ.data])
  const defaultVaultId: Address | null = listQ.data && listQ.data.success ? (listQ.data.data.defaultVaultId || null) : null

  useEffect(() => {
    if (selected) return
    const fromStorage = typeof window !== 'undefined' ? window.localStorage.getItem('selectedVaultId') : null
    const candidate = fromStorage && vaults.includes(fromStorage) ? fromStorage
      : (defaultVaultId && vaults.includes(defaultVaultId) ? defaultVaultId : (vaults[0] || null))
    if (candidate) setSelected(candidate)
  }, [selected, vaults, defaultVaultId])

  const setSelectedVaultId = useCallback((id: Address) => {
    setSelected(id)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selectedVaultId', id)
    }
  }, [])

  const value = useMemo(() => ({
    vaults,
    defaultVaultId,
    selectedVaultId: selected,
    setSelectedVaultId,
    loading: listQ.isLoading,
    error: listQ.error instanceof Error ? listQ.error.message : undefined,
  }), [vaults, defaultVaultId, selected, setSelectedVaultId, listQ.isLoading, listQ.error])

  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}
