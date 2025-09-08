'use client'

import VaultCatalog from '@/components/vault/VaultCatalog'

export default function CatalogPage() {
  return (
    <div className="min-h-screen">
      <div className="site-container max-w-6xl py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Vault Catalog</h1>
          <p className="text-sm text-foreground/70">All configured vaults, names and components</p>
        </div>
        <VaultCatalog />
      </div>
    </div>
  )
}

