'use client'

import { VaultDashboard } from '@/components/vault/VaultDashboard'
import { YieldOpportunities } from '@/components/YieldOpportunities'
import { ProtocolMetrics } from '@/components/ProtocolMetrics'
import VeraHero from '@/components/landing/VeraHero'
import VaultToolbar from '@/components/vault/VaultToolbar'

export default function Home() {
  return (
    <div className="min-h-screen">
      <VeraHero />

      <main id="vaults" className="site-container py-12">
        <div className="mb-6">
          <VaultToolbar />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <VaultDashboard />
            <div className="mt-8">
              <YieldOpportunities />
            </div>
          </div>
          <div>
            <ProtocolMetrics />
          </div>
        </div>
      </main>
    </div>
  )
}
