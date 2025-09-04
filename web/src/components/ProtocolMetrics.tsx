'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ProtocolMetrics() {
  const [allocation, setAllocation] = useState([
    { name: 'Pendle', value: 35, color: '#a3a3a3' },
    { name: 'Beefy', value: 25, color: '#d4d4d4' },
    { name: 'Silo', value: 20, color: '#737373' },
    { name: 'Aave', value: 20, color: '#bdbdbd' }
  ])

  const protocolData = [
    { protocol: 'Pendle', tvl: 2.5, apy: 18.2, risk: 'High' },
    { protocol: 'Beefy', tvl: 7.4, apy: 8.5, risk: 'Low' },
    { protocol: 'Silo', tvl: 36, apy: 2.4, risk: 'Medium' },
    { protocol: 'Aave', tvl: 129.4, apy: 1.3, risk: 'Low' }
  ]

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)]">Strategy Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-[var(--muted)] mb-4">
            Allocation pie chart will be displayed here
          </div>
          <div className="space-y-2">
            {allocation.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[var(--muted)] text-sm">{item.name}</span>
                </div>
                <span className="text-[var(--foreground)] font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="backdrop-blur">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)]">Protocol Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {protocolData.map((protocol, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-[var(--card)] shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-[var(--foreground)] font-medium">{protocol.protocol}</h4>
                <span className={`text-xs px-2 py-1 rounded-full bg-white/10 text-[var(--foreground)]/80`}>
                  {protocol.risk} Risk
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--muted)]">TVL</p>
                  <p className="text-[var(--foreground)]">${protocol.tvl}M</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">APY</p>
                  <p className="text-[var(--foreground)]">{protocol.apy}%</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="backdrop-blur">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)]">AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-white/10">
            <p className="text-[var(--foreground)]/85 text-sm">
              <strong>Opportunity:</strong> Pendle PT yields are 15% above historical average
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/10">
            <p className="text-[var(--foreground)]/85 text-sm">
              <strong>Alert:</strong> Consider rebalancing if Aave utilization drops below 60%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/10">
            <p className="text-[var(--foreground)]/85 text-sm">
              <strong>Trend:</strong> Cross-protocol yield spread narrowing, optimal for diversification
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
