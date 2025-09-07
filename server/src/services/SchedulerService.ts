import cron, { type ScheduledTask } from 'node-cron';
import { RebalancingService } from './RebalancingService.js';
import { VaultService } from './VaultService.js';
import dotenv from 'dotenv';
import { Config } from '../config.js';

dotenv.config();

/**
 * Automated scheduling service for AI-driven vault rebalancing
 */
export class SchedulerService {
  private rebalancingService: RebalancingService;
  private vaultAddresses: string[];
  private isRunning = false;
  private vaultService: VaultService;

  constructor() {
    this.vaultService = new VaultService();
    this.rebalancingService = new RebalancingService(this.vaultService);

    // Get vault addresses from environment variable
    const vaultAddressesStr = process.env.VAULT_ADDRESSES || '';
    this.vaultAddresses = vaultAddressesStr
      .split(',')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);
  }

  /**
   * Start automated rebalancing scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting vault rebalancing scheduler...');

    // Run every hour for fresh AI decisions and optional execution
    cron.schedule(Config.schedAnalysisCron, async () => {
      await this.executeScheduledRebalancing();
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    // Also log status every hour offset by 30m
    cron.schedule(Config.schedMonitorCron, async () => {
      await this.monitorVaults();
    }, { scheduled: true, timezone: 'UTC' });

    this.isRunning = true;
    console.log('Scheduler started successfully');
    console.log(`Monitoring ${this.vaultAddresses.length} vaults`);

    // Run once on startup
    void this.executeScheduledRebalancing();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('Scheduler is not running');
      return;
    }

    cron.getTasks().forEach((task: ScheduledTask) => {
      task.destroy();
    });

    this.isRunning = false;
    console.log('Scheduler stopped');
  }

  /**
   * Execute scheduled rebalancing for all vaults
   */
  private async executeScheduledRebalancing() {
    console.log(`[${new Date().toISOString()}] Starting scheduled check for ${this.vaultAddresses.length} vaults`);

    for (const vaultAddress of this.vaultAddresses) {
      try {
        console.log(`Checking vault ${vaultAddress} for latest recommendation...`);
        const rec = await this.rebalancingService.getRebalanceRecommendation(vaultAddress);
        if (rec.needsRebalancing && rec.confidence > 0.8) {
          console.log(`Executing rebalancing for vault ${vaultAddress} (confidence: ${rec.confidence})`);
          const result = await this.rebalancingService.executeRebalancing(vaultAddress);
          if (result.success && result.transactionHash) {
            console.log(`✅ Rebalancing successful for ${vaultAddress}: ${result.transactionHash}`);
          } else if (result.success) {
            console.log(`ℹ️ No action needed for ${vaultAddress}: ${result.reasoning}`);
          } else {
            console.log(`❌ Rebalancing failed for ${vaultAddress}: ${result.error}`);
          }
        } else {
          console.log(`⏭️ Skipping ${vaultAddress} - ${rec.needsRebalancing ? 'low confidence' : 'no rebalancing needed or no decision'}`);
        }

        // Wait between vaults to avoid overwhelming the network
        await this.sleep(5000);

      } catch (error) {
        console.error(`Error processing vault ${vaultAddress}:`, error);
      }
    }

    console.log(`[${new Date().toISOString()}] Scheduled check completed`);
  }

  /**
   * Monitor vaults and log status
   */
  private async monitorVaults() {
    console.log(`[${new Date().toISOString()}] Monitoring vault status...`);

    for (const vaultAddress of this.vaultAddresses) {
      try {
        const recommendation = await this.rebalancingService.getRebalanceRecommendation(vaultAddress);

        console.log(`Vault ${vaultAddress}:`);
        console.log(`  - Expected APY: ${(recommendation.expectedApy / 100).toFixed(2)}%`);
        console.log(`  - Risk Score: ${recommendation.riskScore.toFixed(2)}`);
        console.log(`  - Confidence: ${recommendation.confidence.toFixed(2)}`);
        console.log(`  - Needs Rebalancing: ${recommendation.needsRebalancing ? '⚠️ Yes' : '✅ No'}`);

        if (recommendation.needsRebalancing) {
          console.log(`  - Reasoning: ${recommendation.reasoning}`);
        }

      } catch (error) {
        console.error(`Error monitoring vault ${vaultAddress}:`, error);
      }
    }
  }

  /**
   * Utility function to add delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      vaultCount: this.vaultAddresses.length,
      vaultAddresses: this.vaultAddresses
    };
  }
}
