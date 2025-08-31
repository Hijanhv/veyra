'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ProtocolMetrics() {
  const [allocation, setAllocation] = useState([
    { name: 'Pendle', value: 35, color: '#8B5CF6' },
    { name: 'Beefy', value: 25, color: '#06B6D4' },
    { name: 'Silo', value: 20, color: '#10B981' },
    { name: 'Aave', value: 20, color: '#F59E0B' }
  ])

  const protocolData = [
    { protocol: 'Pendle', tvl: 2.5, apy: 18.2, risk: 'High' },
    { protocol: 'Beefy', tvl: 7.4, apy: 8.5, risk: 'Low' },
    { protocol: 'Silo', tvl: 36, apy: 2.4, risk: 'Medium' },
    { protocol: 'Aave', tvl: 129.4, apy: 1.3, risk: 'Low' }
  ]

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Strategy Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-400 mb-4">
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
                  <span className="text-gray-300 text-sm">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Protocol Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {protocolData.map((protocol, index) => (
            <div 
              key={index} 
              className="p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-white font-medium">{protocol.protocol}</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  protocol.risk === 'Low' ? 'bg-green-500/20 text-green-300' :
                  protocol.risk === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {protocol.risk} Risk
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">TVL</p>
                  <p className="text-white">${protocol.tvl}M</p>
                </div>
                <div>
                  <p className="text-gray-400">APY</p>
                  <p className="text-white">{protocol.apy}%</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-white/5 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle className="text-white">AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-green-300 text-sm">
              <strong>Opportunity:</strong> Pendle PT yields are 15% above historical average
            </p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-yellow-300 text-sm">
              <strong>Alert:</strong> Consider rebalancing if Aave utilization drops below 60%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-blue-300 text-sm">
              <strong>Trend:</strong> Cross-protocol yield spread narrowing, optimal for diversification
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}