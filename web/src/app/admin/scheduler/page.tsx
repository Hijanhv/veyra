'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSchedulerStatusQuery, useStartSchedulerMutation, useStopSchedulerMutation } from '@/queries/admin'

export default function SchedulerPage() {
  const statusQ = useSchedulerStatusQuery()
  const start = useStartSchedulerMutation()
  const stop = useStopSchedulerMutation()
  const loading = statusQ.isLoading
  const error = (statusQ.data && 'success' in statusQ.data && !statusQ.data.success && (statusQ.data as any).error) || (statusQ.error as any)?.message

  return (
    <div className="min-h-screen">
      <div className="site-container max-w-3xl py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">AI Scheduler</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => statusQ.refetch()}>Refresh</Button>
            <Button variant="success" onClick={() => start.mutate()} disabled={start.isPending}> {start.isPending ? 'Starting…' : 'Start'} </Button>
            <Button variant="destructive" onClick={() => stop.mutate()} disabled={stop.isPending}> {stop.isPending ? 'Stopping…' : 'Stop'} </Button>
          </div>
        </div>

        {error && <div className="mb-6 text-sm text-rose-300">{error}</div>}

        <Card className="backdrop-blur">
          <CardHeader>
            <CardTitle className="text-[var(--foreground)]">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {!statusQ.data || ('success' in statusQ.data && !statusQ.data.success) ? (
              <div className="text-[var(--muted)] text-sm">{loading ? 'Loading…' : 'No status.'}</div>
            ) : (
              <pre className="text-xs text-[var(--foreground)]/90 whitespace-pre-wrap break-words">{JSON.stringify((statusQ.data as any).data, null, 2)}</pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
