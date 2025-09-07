'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, Target, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, erc20Abi, type Address as ViemAddress } from 'viem'
import VeyraVaultArtifact from '@/abi/VeyraVault.json'

export function VaultDashboard() {
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const vaultAddress = useMemo(() => {
    const a = process.env.NEXT_PUBLIC_DEFAULT_VAULT_ID
    return a && a.startsWith('0x') ? (a as ViemAddress) : undefined
  }, [])
  const { address } = useAccount()

  const { data: assetAddress } = useReadContract({
    address: vaultAddress as ViemAddress,
    abi: VeyraVaultArtifact.abi as any,
    functionName: 'asset',
    query: { enabled: !!vaultAddress },
  })

  const { data: assetDecimals } = useReadContract({
    address: assetAddress as ViemAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!assetAddress },
  })

  const { data: allowance } = useReadContract({
    address: assetAddress as ViemAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as ViemAddress, vaultAddress as ViemAddress],
    query: { enabled: !!assetAddress && !!address && !!vaultAddress },
  })

  const { writeContractAsync, data: txHash } = useWriteContract()
  const { isLoading: isPendingTx } = useWaitForTransactionReceipt({ hash: txHash })

  const needsApproval = useMemo(() => {
    try {
      if (!assetDecimals || !allowance || !depositAmount) return false
      const want = parseUnits(depositAmount, assetDecimals as number)
      return want > (allowance as bigint)
    } catch { return true }
  }, [assetDecimals, allowance, depositAmount])

  const performanceData = [
    { date: '2024-01', yield: 8.2 },
    { date: '2024-02', yield: 9.1 },
    { date: '2024-03', yield: 12.4 },
    { date: '2024-04', yield: 15.6 },
    { date: '2024-05', yield: 18.3 }
  ]

  const onDeposit = async () => {
    if (!vaultAddress || !assetAddress || !assetDecimals || !address || !depositAmount) return
    const amount = parseUnits(depositAmount, assetDecimals as number)
    if (needsApproval) {
      await writeContractAsync({
        address: assetAddress as ViemAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [vaultAddress, amount],
      })
    }
    await writeContractAsync({
      address: vaultAddress as ViemAddress,
      abi: VeyraVaultArtifact.abi as any,
      functionName: 'deposit',
      args: [amount, address as `0x${string}`],
    })
    setDepositAmount('')
  }

  const onWithdraw = async () => {
    if (!vaultAddress || !assetDecimals || !address || !withdrawAmount) return
    const amount = parseUnits(withdrawAmount, assetDecimals as number)
    await writeContractAsync({
      address: vaultAddress as ViemAddress,
      abi: VeyraVaultArtifact.abi as any,
      functionName: 'withdraw',
      args: [amount, address as `0x${string}`, address as `0x${string}`],
    })
    setWithdrawAmount('')
  }

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
              <Button className="w-full" onClick={onDeposit} disabled={!depositAmount || isPendingTx || !vaultAddress}>
                {isPendingTx ? 'Pending…' : needsApproval ? 'Approve & Deposit' : 'Deposit'}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--muted)]">Withdraw Amount (USDC)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <Button variant="outline" className="w-full" onClick={onWithdraw} disabled={!withdrawAmount || isPendingTx || !vaultAddress}>
                {isPendingTx ? 'Pending…' : 'Withdraw'}
              </Button>
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
