'use client'

import { VaultDashboard } from '@/components/vault/VaultDashboard'
import { YieldOpportunities } from '@/components/YieldOpportunities'
import { ProtocolMetrics } from '@/components/ProtocolMetrics'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                Veyra
              </h1>
              <span className="text-sm text-gray-400">AI-Powered Yield Optimization</span>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
