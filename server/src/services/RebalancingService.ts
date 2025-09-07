import { ethers } from 'ethers';
import { InvestmentAgent } from './InvestmentAgent.js';
import { AgentCache } from '../cache/agent/AgentCache.js';
import { Config } from '../config.js';
import { VaultService } from './VaultService.js';
import dotenv from 'dotenv';
import type { Address, BasisPoints } from '../types/index.js';

dotenv.config();

/**
 * Rebalancing transaction result
 */
export interface RebalanceResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  oldAllocations: Record<Address, BasisPoints>;
  newAllocations: Record<Address, BasisPoints>;
  confidence: number;
  reasoning: string;
}

/**
 * Service responsible for executing AI-driven rebalancing decisions on-chain
 */
export class RebalancingService {
  private provider: ethers.AbstractProvider;
  private wallet?: ethers.Wallet;

  constructor(
    private readonly investmentAgent: InvestmentAgent,
    private readonly vaultService: VaultService
  ) {
    const rpcUrl = process.env.SONIC_RPC_URL;
    if (!rpcUrl) {
      throw new Error('SONIC_RPC_URL is required');
    }

    this.provider = rpcUrl.startsWith('ws')
      ? new ethers.WebSocketProvider(rpcUrl)
      : new ethers.JsonRpcProvider(rpcUrl);

    // Initialize wallet if private key is provided (for actual rebalancing)
    if (process.env.STRATEGY_MANAGER_PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(process.env.STRATEGY_MANAGER_PRIVATE_KEY, this.provider);
    }
  }

  /**
   * Execute AI-driven rebalancing for a vault
   */
  async executeRebalancing(vaultId: string): Promise<RebalanceResult> {
    try {
      // Get current allocations
      const currentAllocations = await this.vaultService.getStrategyAllocations(vaultId);
      // Use cached AI recommendation (do not call AI here)
      const cached = AgentCache.getLatest(vaultId);
      if (!cached) {
        return {
          success: false,
          error: 'No cached recommendation available. Scheduler has not produced one yet.',
          oldAllocations: currentAllocations,
          newAllocations: currentAllocations,
          confidence: 0,
          reasoning: 'Awaiting scheduled AI run to cache a recommendation.'
        };
      }
      const recommendation = {
        recommendedAllocation: JSON.parse(cached.allocations_json) as Record<Address, BasisPoints>,
        confidence: cached.confidence,
        reasoning: cached.reasoning ?? 'Cached recommendation',
      };

      // Check if rebalancing is needed (threshold: 5% difference)
      const needsRebalancing = this.shouldRebalance(currentAllocations, recommendation.recommendedAllocation);

      if (!needsRebalancing) {
        return {
          success: true,
          oldAllocations: currentAllocations,
          newAllocations: currentAllocations,
          confidence: recommendation.confidence,
          reasoning: 'No rebalancing needed - allocations are within acceptable thresholds'
        };
      }

      // Execute rebalancing transaction if wallet is available
      if (this.wallet && recommendation.confidence > Config.rebalanceMinConfidence) {
        const txHash = await this.executeRebalanceTransaction(vaultId, recommendation.recommendedAllocation);

        return {
          success: true,
          transactionHash: txHash,
          oldAllocations: currentAllocations,
          newAllocations: recommendation.recommendedAllocation,
          confidence: recommendation.confidence,
          reasoning: recommendation.reasoning
        };
      } else {
        return {
          success: true,
          oldAllocations: currentAllocations,
          newAllocations: recommendation.recommendedAllocation,
          confidence: recommendation.confidence,
          reasoning: `AI recommends rebalancing but ${!this.wallet ? 'no wallet configured' : 'confidence too low'}: ${recommendation.reasoning}`
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        oldAllocations: {},
        newAllocations: {},
        confidence: 0,
        reasoning: 'Failed to execute rebalancing'
      };
    }
  }

  /**
   * Check if rebalancing is needed based on allocation differences
   */
  shouldRebalance(
    current: Record<Address, BasisPoints>,
    recommended: Record<Address, BasisPoints>
  ): boolean {
    const threshold = Config.rebalanceThresholdBp; // basis points

    for (const [strategy, recommendedAlloc] of Object.entries(recommended)) {
      const currentAlloc = current[strategy] || 0;
      const difference = Math.abs(recommendedAlloc - currentAlloc);

      if (difference > threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Execute the actual rebalancing transaction on-chain
   */
  private async executeRebalanceTransaction(
    vaultId: Address,
    newAllocations: Record<Address, BasisPoints>
  ): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not configured for transaction execution');
    }

    // Vault contract ABI (minimal - just rebalance function)
    const vaultAbi = [
      'function rebalance(uint256[] calldata newAllocations) external'
    ];

    const vaultContract = new ethers.Contract(vaultId, vaultAbi, this.wallet);

    // Get strategies in order and build allocation array
    const vault = new ethers.Contract(vaultId, [
      'function strategies(uint256) view returns (address)'
    ], this.provider);

    const strategies: Address[] = [];
    let index = 0;

    // Get all strategies
    while (true) {
      try {
        const strategy = await vault.strategies(index);
        if (strategy && ethers.isAddress(strategy)) {
          strategies.push(strategy as Address);
          index++;
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    // Build allocation array in correct order
    const allocationArray = strategies.map(strategy => newAllocations[strategy] || 0);

    // Execute rebalancing transaction
    const tx = await vaultContract.rebalance(allocationArray, {
      gasLimit: Config.rebalanceGasLimit
    });

    await tx.wait();

    return tx.hash;
  }

  /**
   * Get current rebalancing recommendation without executing
   */
  async getRebalanceRecommendation(vaultId: string) {
    const currentAllocations = await this.vaultService.getStrategyAllocations(vaultId);
    const cached = AgentCache.getLatest(vaultId);
    if (!cached) {
      return {
        currentAllocations,
        recommendedAllocations: currentAllocations,
        needsRebalancing: false,
        confidence: 0,
        reasoning: 'No cached recommendation. Scheduler will populate shortly.',
        marketContext: 'N/A',
        expectedApy: 0,
        riskScore: 0
      };
    }

    const rec = JSON.parse(cached.allocations_json) as Record<Address, BasisPoints>;
    return {
      currentAllocations,
      recommendedAllocations: rec,
      needsRebalancing: this.shouldRebalance(currentAllocations, rec),
      confidence: cached.confidence,
      reasoning: cached.reasoning ?? 'Cached recommendation',
      marketContext: cached.market_context ?? 'N/A',
      expectedApy: cached.expected_apy_bp,
      riskScore: cached.risk_score
    };
  }

  /** Execute rebalancing given an already computed recommendation */
  async executeRebalancingWithRecommendation(
    vaultId: string,
    rec: { allocations: Record<Address, BasisPoints>; confidence: number; reasoning?: string }
  ): Promise<RebalanceResult> {
    const currentAllocations = await this.vaultService.getStrategyAllocations(vaultId);
    const recommendation = {
      recommendedAllocation: rec.allocations,
      confidence: rec.confidence,
      reasoning: rec.reasoning ?? 'Scheduled recommendation'
    };

    const needsRebalancing = this.shouldRebalance(currentAllocations, recommendation.recommendedAllocation);
    if (!needsRebalancing) {
      return {
        success: true,
        oldAllocations: currentAllocations,
        newAllocations: currentAllocations,
        confidence: recommendation.confidence,
        reasoning: 'No rebalancing needed - allocations are within acceptable thresholds'
      };
    }

    if (this.wallet && recommendation.confidence > Config.rebalanceMinConfidence) {
      const txHash = await this.executeRebalanceTransaction(vaultId, recommendation.recommendedAllocation);
      return {
        success: true,
        transactionHash: txHash,
        oldAllocations: currentAllocations,
        newAllocations: recommendation.recommendedAllocation,
        confidence: recommendation.confidence,
        reasoning: recommendation.reasoning
      };
    }

    return {
      success: true,
      oldAllocations: currentAllocations,
      newAllocations: recommendation.recommendedAllocation,
      confidence: recommendation.confidence,
      reasoning: `AI recommends rebalancing but ${!this.wallet ? 'no wallet configured' : 'confidence too low'}: ${recommendation.reasoning}`
    };
  }
}
