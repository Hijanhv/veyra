'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TrendingUp, DollarSign, Target, Zap, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, erc20Abi, type Address as ViemAddress, type Abi } from 'viem'
import VeyraVaultArtifact from '@/abi/VeyraVault.json'
import { useVault } from '@/context/VaultContext'
import { useAIRebalanceQuery, useVaultMetricsQuery } from '@/queries/vaults'
import { TokenMinting } from '@/components/tokens/TokenMinting'
import { SONICSCAN_BASE } from '@/lib/explorer'

export function VaultDashboard() {
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [activeTab, setActiveTab] = useState('vault')

  const { selectedVaultId } = useVault()
  const vaultAddress = useMemo(() => (selectedVaultId && selectedVaultId.startsWith('0x') ? (selectedVaultId as ViemAddress) : undefined), [selectedVaultId])
  const { address } = useAccount()

  const { data: assetAddress } = useReadContract({
    address: vaultAddress as ViemAddress,
    abi: VeyraVaultArtifact.abi as Abi,
    functionName: 'asset',
    query: { enabled: !!vaultAddress },
  })

  const { data: assetDecimals } = useReadContract({
    address: assetAddress as ViemAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!assetAddress },
  })

  const { data: assetSymbol } = useReadContract({
    address: assetAddress as ViemAddress,
    abi: erc20Abi,
    functionName: 'symbol',
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
      if (!assetDecimals || allowance === undefined || !depositAmount) return false
      const want = parseUnits(depositAmount, assetDecimals as number)
      return want > (allowance as bigint)
    } catch { return true }
  }, [assetDecimals, allowance, depositAmount])

  const metricsQ = useVaultMetricsQuery(vaultAddress)
  const aiQ = useAIRebalanceQuery(vaultAddress)

  const { data: shareBalance } = useReadContract({
    address: vaultAddress as ViemAddress,
    abi: VeyraVaultArtifact.abi as Abi,
    functionName: 'balanceOf',
    args: [address as ViemAddress],
    query: { enabled: !!vaultAddress && !!address },
  })

  const { data: userAssetBalance } = useReadContract({
    address: vaultAddress as ViemAddress,
    abi: VeyraVaultArtifact.abi as Abi,
    functionName: 'convertToAssets',
    args: [(shareBalance as bigint) ?? BigInt(0)],
    query: { enabled: !!vaultAddress && !!shareBalance },
  })

  const onDeposit = async () => {
    if (!vaultAddress || !assetAddress || !assetDecimals || !address || !depositAmount) return
    const amount = parseUnits(depositAmount, assetDecimals as number)
    if (needsApproval) {
      await writeContractAsync({
        address: assetAddress as ViemAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [vaultAddress, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
      })
    }
    await writeContractAsync({
      address: vaultAddress as ViemAddress,
      abi: VeyraVaultArtifact.abi as Abi,
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
      abi: VeyraVaultArtifact.abi as Abi,
      functionName: 'withdraw',
      args: [amount, address as `0x${string}`, address as `0x${string}`],
    })
    setWithdrawAmount('')
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vault">Vault Dashboard</TabsTrigger>
          <TabsTrigger value="tokens">Mint Test Tokens</TabsTrigger>
        </TabsList>

        <TabsContent value="vault" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground/70">Total Value Locked</CardTitle>
                <DollarSign className="h-4 w-4 text-foreground/60" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metricsQ.data && 'success' in metricsQ.data && metricsQ.data.success
                    ? `$${(metricsQ.data.data.totalAssets ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : '—'}
                </div>
                <p className="text-xs text-foreground/70">Live on-chain</p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground/70">Current APY</CardTitle>
                <TrendingUp className="h-4 w-4 text-foreground/60" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metricsQ.data && 'success' in metricsQ.data && metricsQ.data.success
                    ? `${(metricsQ.data.data.currentApy ?? 0).toFixed(2)}%`
                    : '—'}
                </div>
                <p className="text-xs text-foreground/70">Weighted across strategies</p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground/70">Active Strategies</CardTitle>
                <Target className="h-4 w-4 text-foreground/60" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metricsQ.data && 'success' in metricsQ.data && metricsQ.data.success
                    ? Object.keys(metricsQ.data.data.strategyAllocation || {}).length
                    : '—'}
                </div>
                <p className="text-xs text-foreground/70">Across protocols</p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground/70">Risk Score</CardTitle>
                <Zap className="h-4 w-4 text-foreground/60" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {aiQ.data && 'success' in aiQ.data && aiQ.data.success
                    ? (() => {
                      const r = aiQ.data.data.riskScore as number | undefined
                      if (r === undefined || r === null) return '—'
                      if (r < 0.3) return 'Low'
                      if (r < 0.6) return 'Medium'
                      return 'High'
                    })()
                    : '—'}
                </div>
                <p className="text-xs text-foreground/70">AI recommendation</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="backdrop-blur">
              <CardHeader>
                <CardTitle className="text-foreground">Yield Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-foreground/70">
                  Performance chart will be displayed here
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur">
              <CardHeader>
                <CardTitle className="text-foreground">Vault Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/70">Deposit Amount ({(assetSymbol as string) || 'Token'})</label>
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
                  <label className="text-sm font-medium text-foreground/70">Withdraw Amount ({(assetSymbol as string) || 'Token'})</label>
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

                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">Your Balance:</span>
                    <span className="text-foreground">
                      {userAssetBalance && assetDecimals !== undefined
                        ? `${Number(userAssetBalance as bigint) / 10 ** Number(assetDecimals)} ${(assetSymbol as string) || ''}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">Vault Shares:</span>
                    <span className="text-foreground">
                      {shareBalance !== undefined ? `${shareBalance?.toString?.()}` : '—'}
                    </span>
                  </div>
                  {vaultAddress && (
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/70">Vault Contract:</span>
                      <span className="flex items-center gap-1">
                        <span className="text-foreground font-mono text-xs">
                          {vaultAddress.slice(0, 6)}...{vaultAddress.slice(-4)}
                        </span>
                        <a
                          href={`${SONICSCAN_BASE}/address/${vaultAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-400"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </span>
                    </div>
                  )}
                  {(assetAddress as string) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/70">Asset Contract:</span>
                      <span className="flex items-center gap-1">
                        <span className="text-foreground font-mono text-xs">
                          {(assetAddress as string).slice(0, 6)}...{(assetAddress as string).slice(-4)}
                        </span>
                        <a
                          href={`${SONICSCAN_BASE}/address/${assetAddress as string}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-400"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tokens">
          <TokenMinting />
        </TabsContent>
      </Tabs>
    </div>
  )
}
