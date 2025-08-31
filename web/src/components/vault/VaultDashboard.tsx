'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, Target, Zap } from 'lucide-react'

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
        <Card className="bg-white/5 backdrop-blur border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Value Locked</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$2.4M</div>
            <p className="text-xs text-green-400">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Current APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">18.3%</div>
            <p className="text-xs text-green-400">AI-optimized yield</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Strategies</CardTitle>
            <Target className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">4</div>
            <p className="text-xs text-gray-400">Across protocols</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Risk Score</CardTitle>
            <Zap className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">Medium</div>
            <p className="text-xs text-yellow-400">Balanced approach</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 backdrop-blur border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Yield Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-400">
              Performance chart will be displayed here
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Vault Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Deposit Amount (USDC)</label>
              <input
                type="number"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-2 px-4 rounded-md transition-all">
                Deposit
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Withdraw Amount (USDC)</label>
              <input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button className="w-full border border-white/20 text-white hover:bg-white/10 py-2 px-4 rounded-md transition-all">
                Withdraw
              </button>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Your Balance:</span>
                <span className="text-white">1,234.56 USDC</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Vault Shares:</span>
                <span className="text-white">1,150.23</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}