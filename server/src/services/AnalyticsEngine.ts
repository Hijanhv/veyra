import { VaultService } from './VaultService.js';
import type { UnderlyingProtocol } from '../types/vault.js';

export interface MarketInsights {
  marketSentiment: string;
  topOpportunities: Array<{
    strategy: string;
    apy: number; // APY as a percentage
    reasoning: string;
  }>;
  riskFactors: string[];
  timestamp: string;
}

export interface YieldPredictions {
  predictions: Record<string, {
    nextWeek: number;
    nextMonth: number;
    confidence: number;
  }>;
  methodology: string;
}

/**
 * Takes vault data and turns it into market insights and yield predictions.
 * Uses mathematical analysis of on-chain metrics.
 */
export class AnalyticsEngine {
  constructor(private readonly vaultService: VaultService) { }

  /**
   * Analyzes current APYs and spits out market sentiment, top strategies, and risk warnings.
   */
  async generateMarketInsights(vaultId: string): Promise<MarketInsights> {
    const details = await this.vaultService.getStrategyDetails(vaultId);
    // Calculate the average APY across all strategies
    let totalApyPct = 0;
    details.forEach((s) => {
      const apyPercent = (s.apy || 0) / 100;
      totalApyPct += apyPercent;
    });
    const avgApy = details.length > 0 ? totalApyPct / details.length : 0;
    // Figure out if the market looks good based on average yields
    let marketSentiment: string;
    if (avgApy >= 15) {
      marketSentiment = 'bullish';
    } else if (avgApy <= 5) {
      marketSentiment = 'bearish';
    } else {
      marketSentiment = 'neutral';
    }
    // Find the highest-yielding strategies to highlight
    const sorted = details
      .slice()
      .sort((a, b) => (b.apy || 0) - (a.apy || 0));
    const top = sorted.slice(0, 3).map((s) => {
      const apyPercent = (s.apy || 0) / 100;
      const reason = this.composeReasoning(s.underlying);
      return {
        strategy: s.strategyAddress,
        apy: apyPercent,
        reasoning: reason,
      };
    });
    // Collect all the risk factors we can find across strategies
    const riskSet = new Set<string>();
    details.forEach((s) => {
      s.underlying.forEach((u: UnderlyingProtocol) => {
        // Check for liquidation risk
        if ('healthFactor' in u && u.healthFactor !== null && u.healthFactor !== undefined) {
          if ((u.healthFactor as number) < 1.1) {
            riskSet.add('Very low health factors (liquidation risk)');
          } else if ((u.healthFactor as number) < 1.3) {
            riskSet.add('Low health factors (near liquidation threshold)');
          }
        }
        // Look for positions where borrowing costs more than earning
        if ('supplyApy' in u && 'borrowApy' in u) {
          if ((u.borrowApy || 0) > (u.supplyApy || 0)) {
            riskSet.add('Negative carry (borrow APY exceeds supply)');
          }
        }
        // Flag low-performing liquidity pools
        if ('apr' in u) {
          if ((u.apr || 0) < 100) {
            riskSet.add('Low APR in liquidity pools');
          }
        }
      });
    });
    // Add the standard DeFi warning about smart contract risks
    riskSet.add('Smart contract and protocol risk');
    const riskFactors = Array.from(riskSet);
    return {
      marketSentiment,
      topOpportunities: top,
      riskFactors,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Builds a human-readable explanation for why we think a strategy is good/bad.
   */
  private composeReasoning(underlying: UnderlyingProtocol[]): string {
    const parts: string[] = [];
    underlying.forEach((u) => {
      if (u.name === 'Lending') {
        const supply = 'supplyApy' in u ? u.supplyApy || 0 : 0;
        const borrow = 'borrowApy' in u ? u.borrowApy || 0 : 0;
        if (supply > 0) {
          parts.push(`lending supply ${supply / 100}%`);
        }
        if (borrow > 0) {
          parts.push(`borrow cost ${borrow / 100}%`);
        }
        if ('healthFactor' in u && u.healthFactor !== null && u.healthFactor !== undefined) {
          if ((u.healthFactor as number) > 1.5) {
            parts.push('healthy collateral');
          } else if ((u.healthFactor as number) < 1.3) {
            parts.push('borderline collateral');
          }
        }
      } else if (u.name === 'Eggs') {
        const supply = 'supplyApy' in u ? u.supplyApy || 0 : 0;
        const borrow = 'borrowApy' in u ? u.borrowApy || 0 : 0;
        if (supply > 0) {
          parts.push(`Eggs yield ${supply / 100}%`);
        }
        if (borrow > 0) {
          parts.push(`Eggs borrow cost ${borrow / 100}%`);
        }
        if ('healthFactor' in u && u.healthFactor !== null && u.healthFactor !== undefined) {
          if ((u.healthFactor as number) > 1.5) {
            parts.push('healthy Eggs position');
          } else if ((u.healthFactor as number) < 1.3) {
            parts.push('Eggs position near liquidation');
          }
        }
      } else if (u.name === 'Rings') {
        const apr = 'apr' in u ? u.apr || 0 : 0;
        if (apr > 0) {
          parts.push(`Rings yield ${apr / 100}%`);
        }
      } else if (u.name === 'Shadow' || u.name === 'Beets' || u.name === 'SwapX') {
        const apr = 'apr' in u ? u.apr || 0 : 0;
        if (apr > 0) {
          parts.push(`${u.name} APR ${apr / 100}%`);
        }
      }
    });
    return parts.length > 0 ? parts.join('; ') : 'No significant yield data';
  }

  /**
   * Tries to predict where yields are going using mean reversion.
   * High yields usually drop, low yields usually rise.
   */
  async predictYieldTrends(vaultId: string): Promise<YieldPredictions> {
    const details = await this.vaultService.getStrategyDetails(vaultId);
    // Calculate the average yield across all strategies
    let totalApyPct = 0;
    details.forEach((s) => {
      totalApyPct += (s.apy || 0) / 100;
    });
    const avg = details.length > 0 ? totalApyPct / details.length : 0;
    const predictions: Record<string, { nextWeek: number; nextMonth: number; confidence: number }> = {};
    details.forEach((s) => {
      const key = s.strategyAddress;
      const currentPct = (s.apy || 0) / 100;
      // Apply mean reversion - yields tend to move toward the average over time
      const diff = avg - currentPct;
      const adjust = diff * 0.2; // gradual movement toward average (20% per week)
      const nextWeek = Math.max(0, currentPct + adjust);
      const nextMonth = Math.max(0, currentPct + adjust * 2 * 0.9); // longer term with some dampening
      // Start with moderate confidence, then reduce for risky positions
      let confidence = 0.7;
      s.underlying.forEach((u: any) => {
        if (u.healthFactor !== undefined && u.healthFactor !== null) {
          if (u.healthFactor < 1.3) confidence -= 0.2; // less confident if close to liquidation
        }
        if (u.supplyApy !== undefined && u.borrowApy !== undefined) {
          if ((u.borrowApy || 0) > (u.supplyApy || 0)) confidence -= 0.1; // less confident if losing money
        }
      });
      if (confidence < 0.4) confidence = 0.4;
      if (confidence > 0.9) confidence = 0.9;
      predictions[key] = {
        nextWeek: Number(nextWeek.toFixed(2)),
        nextMonth: Number(nextMonth.toFixed(2)),
        confidence: Number(confidence.toFixed(2)),
      };
    });
    return {
      predictions,
      methodology: 'Simple mean-reversion model adjusted for current risks and health factors',
    };
  }
}
