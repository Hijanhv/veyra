'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAccount } from 'wagmi'
import { Coins, ExternalLink, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { getTokens, mintToken, type TokenInfo, type MintResult } from '@/lib/api'
import { SONICSCAN_BASE } from '@/lib/explorer'

export function TokenMinting() {
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [mintAmount, setMintAmount] = useState('100')
  const [mintingIndividual, setMintingIndividual] = useState<string | null>(null)
  const [results, setResults] = useState<MintResult[]>([])

  const { address } = useAccount()

  useEffect(() => {
    loadTokens()
  }, [])

  const loadTokens = async () => {
    try {
      const response = await getTokens()
      if (response.success) {
        setTokens(response.data)
      }
    } catch (error) {
      console.error('Failed to load tokens:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleMintToken = async (tokenAddress: string) => {
    if (!address) return

    setMintingIndividual(tokenAddress)

    try {
      const response = await mintToken({
        to: address,
        amount: mintAmount,
        tokenAddress: tokenAddress as any
      })

      if (response.success) {
        // Add successful result
        const token = tokens.find(t => t.address === tokenAddress)
        const newResult: MintResult = {
          success: true,
          tokenAddress: tokenAddress as any,
          name: token?.name,
          symbol: token?.symbol,
          txHash: response.data.txHash,
          amount: response.data.amount,
          blockNumber: response.data.blockNumber
        }
        setResults(prev => [...prev, newResult])
      }
    } catch (error: any) {
      // Add failed result
      const token = tokens.find(t => t.address === tokenAddress)
      const newResult: MintResult = {
        success: false,
        tokenAddress: tokenAddress as any,
        name: token?.name,
        symbol: token?.symbol,
        error: error.message || 'Minting failed'
      }
      setResults(prev => [...prev, newResult])
    } finally {
      setMintingIndividual(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-foreground/70">
        <Coins className="h-4 w-4" />
        <span>Mock tokens for testing on Sonic testnet</span>
      </div>

      <Card className="backdrop-blur">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)] flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Mint Test Tokens
          </CardTitle>
          <p className="text-sm text-foreground/70">
            Get test tokens to interact with the vault. These are mock ERC20 tokens deployed for testing purposes.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/70">Amount per Token</label>
            <Input
              type="number"
              placeholder="100"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
            />
          </div>


          {!address && (
            <p className="text-sm text-foreground/70 text-center">
              Connect your wallet to mint tokens
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="backdrop-blur">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)]">Available Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tokens.map((token) => (
              <div key={token.address} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {token.symbol}
                      <Badge variant="outline">{token.decimals} decimals</Badge>
                    </div>
                    <div className="text-sm text-foreground/70">{token.name}</div>
                  </div>
                </div>

                <div className="text-xs text-foreground/60 font-mono break-all">
                  {token.address}
                  <a
                    href={`${SONICSCAN_BASE}/address/${token.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-1 text-blue-500 hover:text-blue-400"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMintToken(token.address)}
                  disabled={!address || mintingIndividual === token.address || !mintAmount}
                  className="w-full"
                >
                  {mintingIndividual === token.address ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Minting...
                    </>
                  ) : (
                    `Mint ${mintAmount} ${token.symbol}`
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="backdrop-blur">
          <CardHeader>
            <CardTitle className="text-[var(--foreground)]">Minting Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">{result.symbol || 'Unknown'}</span>
                    {result.success && result.amount && (
                      <Badge variant="outline">+{result.amount}</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {result.success && result.txHash && (
                      <a
                        href={`${SONICSCAN_BASE}/tx/${result.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-400"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {!result.success && result.error && (
                      <span className="text-xs text-red-500">{result.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}