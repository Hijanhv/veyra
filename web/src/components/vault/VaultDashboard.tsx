'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, Target, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function VaultDashboard() {
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const performanceData = [
    { date: '2024-01', yield: 8.2 },
    { date: '2024-02', yield: 9.1 },
    { date: '2024-03', yield: 12.4 },
    { date: '2024-04', yield: 15.6 },
    { date: '2024-05', yield: 18.3 }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted)]">Total Value Locked</CardTitle>
            <DollarSign className="h-4 w-4 text-[var(--muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--foreground)]">$2.4M</div>
            <p className="text-xs text-[var(--muted)]">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted)]">Current APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-[var(--muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--foreground)]">18.3%</div>
            <p className="text-xs text-[var(--muted)]">AI-optimized yield</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted)]">Active Strategies</CardTitle>
            <Target className="h-4 w-4 text-[var(--muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--foreground)]">4</div>
            <p className="text-xs text-[var(--muted)]">Across protocols</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted)]">Risk Score</CardTitle>
            <Zap className="h-4 w-4 text-[var(--muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--foreground)]">Medium</div>
            <p className="text-xs text-[var(--muted)]">Balanced approach</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="backdrop-blur">
          <CardHeader>
            <CardTitle className="text-[var(--foreground)]">Yield Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-[var(--muted)]">
              Performance chart will be displayed here
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur">
          <CardHeader>
            <CardTitle className="text-[var(--foreground)]">Vault Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--muted)]">Deposit Amount (USDC)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
              <Button className="w-full">Deposit</Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--muted)]">Withdraw Amount (USDC)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <Button variant="outline" className="w-full">Withdraw</Button>
            </div>

            <div className="pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Your Balance:</span>
                <span className="text-[var(--foreground)]">1,234.56 USDC</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-[var(--muted)]">Vault Shares:</span>
                <span className="text-[var(--foreground)]">1,150.23</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
