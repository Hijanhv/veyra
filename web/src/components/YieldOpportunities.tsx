'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, AlertCircle } from 'lucide-react'

interface YieldOpportunity {
  protocol: string
  asset: string
  apy: number
  tvl: number
  strategy: string
  riskScore: number
  maturity?: string
}

export function YieldOpportunities() {
  const [opportunities, setOpportunities] = useState<YieldOpportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now - replace with actual API call
    setTimeout(() => {
      setOpportunities([
        {
          protocol: 'PENDLE',
          asset: 'wstkscUSD-PT',
          apy: 18.2,
          tvl: 2500000,
          strategy: 'yield-tokenization',
          riskScore: 0.6,
          maturity: '2025-05-29'
        },
        {
          protocol: 'BEEFY',
          asset: 'beS',
          apy: 8.5,
          tvl: 7440000,
          strategy: 'auto-compound',
          riskScore: 0.3
        },
        {
          protocol: 'SILO',
          asset: 'USDC',
          apy: 2.4,
          tvl: 36000000,
          strategy: 'isolated-lending',
          riskScore: 0.4
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const getRiskColor = (score: number) => {
    if (score < 0.3) return 'text-green-400'
    if (score < 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getRiskLabel = (score: number) => {
    if (score < 0.3) return 'Low'
    if (score < 0.6) return 'Medium'
    return 'High'
  }

  return (
    <Card className="backdrop-blur">
      <CardHeader>
        <CardTitle className="text-[var(--foreground)] flex items-center gap-2">
          AI-Detected Yield Opportunities
          <span className="bg-white/10 text-[var(--foreground)]/80 px-2 py-1 rounded-md text-xs">
            Live
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-white/5 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp, index) => (
              <div 
                key={index}
                className="p-4 rounded-lg bg-[var(--card)] shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                      {opp.protocol[0]}
                    </div>
                    <div>
                      <h4 className="text-[var(--foreground)] font-medium">{opp.protocol}</h4>
                      <p className="text-[var(--muted)] text-sm">{opp.asset}</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-[var(--muted)]" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-[var(--muted)] text-xs">APY</p>
                    <p className="text-[var(--foreground)] font-bold">{opp.apy}%</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)] text-xs">TVL</p>
                    <p className="text-[var(--foreground)] font-medium">
                      ${(opp.tvl / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)] text-xs">Strategy</p>
                    <p className="text-[var(--foreground)] font-medium capitalize">
                      {opp.strategy.replace('-', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)] text-xs">Risk</p>
                    <div className="flex items-center gap-2">
                      <AlertCircle className={`h-3 w-3 ${getRiskColor(opp.riskScore)}`} />
                      <p className={`font-medium ${getRiskColor(opp.riskScore)}`}>
                        {getRiskLabel(opp.riskScore)}
                      </p>
                    </div>
                  </div>
                </div>

                {opp.maturity && (
                  <div className="mb-3">
                    <p className="text-[var(--muted)] text-xs">Maturity</p>
                    <p className="text-[var(--foreground)] text-sm">{opp.maturity}</p>
                  </div>
                )}

                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-white/50 h-2 rounded-full"
                    style={{ width: `${Math.min(opp.apy * 5, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
