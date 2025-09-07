'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useInsightsQuery, usePredictionsQuery } from '@/queries/analytics'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useVault } from '@/context/VaultContext'
import type { MarketInsights, YieldPredictions } from '@/types/api'

export default function AnalyticsPage() {
  const { selectedVaultId } = useVault()
  const insightsQ = useInsightsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const predictionsQ = usePredictionsQuery(selectedVaultId || undefined, { enabled: !!selectedVaultId })
  const insights: MarketInsights | undefined = insightsQ.data && insightsQ.data.success ? insightsQ.data.data : undefined
  const predictions: YieldPredictions | undefined = predictionsQ.data && predictionsQ.data.success ? predictionsQ.data.data : undefined
  const error = (insightsQ.data && !insightsQ.data.success && insightsQ.data.error)
    || (predictionsQ.data && !predictionsQ.data.success && predictionsQ.data.error)
    || (insightsQ.error instanceof Error ? insightsQ.error.message : undefined)
    || (predictionsQ.error instanceof Error ? predictionsQ.error.message : undefined)

  return (
    <div className="min-h-screen">
      <div className="site-container max-w-6xl py-10">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Analytics</h1>
            <p className="text-sm text-[var(--muted)]">Market insights and yield trend predictions</p>
            <p className="text-xs text-[var(--muted)] mt-1">Selected: {selectedVaultId ? `${selectedVaultId.slice(0, 6)}…${selectedVaultId.slice(-4)}` : '—'}</p>
          </div>
        </div>

        {error && <div className="mb-6 text-sm text-rose-300">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Market Insights</CardTitle>
            </CardHeader>
            <CardContent>
              {!insights ? (
                <div className="text-[var(--muted)] text-sm">No insights yet.</div>
              ) : (
                <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify(insights, null, 2)}</pre>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--foreground)]">Yield Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              {!predictions ? (
                <div className="text-[var(--muted)] text-sm">No predictions yet.</div>
              ) : (
                <div className="space-y-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={Object.entries(predictions.predictions).map(([addr, p]) => ({
                        name: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
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
                  <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify(predictions, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
