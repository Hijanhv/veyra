'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useInsightsQuery, usePredictionsQuery } from '@/queries/analytics'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts'

export default function AnalyticsPage() {
  const [vaultId, setVaultId] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_VAULT_ID || '')
  const [submitted, setSubmitted] = useState<string | null>(vaultId || null)

  const insightsQ = useInsightsQuery(submitted || undefined, { enabled: !!submitted })
  const predictionsQ = usePredictionsQuery(submitted || undefined, { enabled: !!submitted })

  const loading = insightsQ.isLoading || predictionsQ.isLoading
  const error = (insightsQ.data && 'success' in insightsQ.data && !insightsQ.data.success && (insightsQ.data as any).error)
    || (predictionsQ.data && 'success' in predictionsQ.data && !predictionsQ.data.success && (predictionsQ.data as any).error)
    || (insightsQ.error as any)?.message
    || (predictionsQ.error as any)?.message

  return (
    <div className="min-h-screen">
      <div className="site-container max-w-6xl py-10">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Analytics</h1>
            <p className="text-sm text-[var(--muted)]">Market insights and yield trend predictions</p>
          </div>
          <div className="flex gap-2">
            <Input value={vaultId} onChange={e=>setVaultId(e.target.value)} placeholder="Vault address" className="min-w-[360px]" />
            <Button onClick={() => setSubmitted(vaultId)} disabled={!vaultId || loading}>
              {loading ? 'Loading…' : 'Load'}
            </Button>
          </div>
        </div>

        {error && <div className="mb-6 text-sm text-rose-300">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Market Insights</CardTitle>
            </CardHeader>
            <CardContent>
              {!insightsQ.data || ('success' in insightsQ.data && !insightsQ.data.success) ? (
                <div className="text-[var(--muted)] text-sm">No insights yet.</div>
              ) : (
                <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify((insightsQ.data as any).data, null, 2)}</pre>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Yield Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              {!predictionsQ.data || ('success' in predictionsQ.data && !predictionsQ.data.success) ? (
                <div className="text-[var(--muted)] text-sm">No predictions yet.</div>
              ) : (
                <div className="space-y-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={Object.entries((predictionsQ.data as any).data.predictions).map(([addr, p]: any) => ({
                        name: `${addr.slice(0,6)}…${addr.slice(-4)}`,
                        nextWeek: p.nextWeek,
                        nextMonth: p.nextMonth,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--muted)' }} />
                        <YAxis tick={{ fill: 'var(--muted)' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="nextWeek" stroke="#60a5fa" name="Next Week %" />
                        <Line type="monotone" dataKey="nextMonth" stroke="#34d399" name="Next Month %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify((predictionsQ.data as any).data, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
