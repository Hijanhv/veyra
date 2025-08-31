import cron from 'node-cron'
import { ProtocolService } from './ProtocolService.js'

interface YieldData {
  data: any[]
  timestamp: string
}

export class ProtocolMonitor {
  private protocolService: ProtocolService
  private yieldData: Map<string, YieldData>

  constructor() {
    this.protocolService = new ProtocolService()
    this.yieldData = new Map()
  }

  startMonitoring(): void {
    // Update yield data every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('Updating yield opportunities...')
        const opportunities = await this.protocolService.getAllYieldOpportunities()
        this.yieldData.set('latest', {
          data: opportunities,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('Yield monitoring error:', error)
      }
    })

    // Daily analytics update
    cron.schedule('0 0 * * *', async () => {
      try {
        console.log('Running daily analytics...')
        // TODO: Generate daily reports, risk assessments
      } catch (error) {
        console.error('Daily analytics error:', error)
      }
    })
  }

  getLatestData(): YieldData | undefined {
    return this.yieldData.get('latest')
  }
}