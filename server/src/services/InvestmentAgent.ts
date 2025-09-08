import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { VaultService } from './VaultService.js';
import dotenv from 'dotenv';
import type { RecommendedAllocation, StrategyAnalysis } from '../types/ai.js';
import type { StrategyDetails } from '../types/vault.js';
import type { Address } from '../types/common.js';
import { Repository } from './db/Repository.js';
import { AgentCache } from '../cache/agent/AgentCache.js';
import { Config } from '../config.js';

dotenv.config();

/**
 * AI-powered investment agent that makes sophisticated allocation decisions
 * using Claude Sonnet 4 to analyze DeFi strategies and market conditions
 */
export class InvestmentAgent {
  private model: ReturnType<typeof anthropic>;

  constructor(private readonly vaultService: VaultService) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for AI decision making');
    }
    this.model = anthropic(Config.aiModel);
  }

  /**
   * AI-powered allocation optimization using Claude Sonnet 4.
   */
  async getOptimalAllocation(vaultId: string): Promise<RecommendedAllocation> {
    try {
      const strategyDetails = await this.vaultService.getStrategyDetails(vaultId);
      const enhancedStrategies = await Promise.all(
        strategyDetails.map(async (strategy) => this.analyzeStrategy(strategy))
      );
      const aiDecision = await this.makeAIAllocationDecision(enhancedStrategies, vaultId as Address);
      return aiDecision;
    } catch (error) {
      console.error('AI allocation failed:', error);
      throw error;
    }
  }

  private async analyzeStrategy(strategy: StrategyDetails): Promise<StrategyAnalysis> {
    const strategyType = this.identifyStrategyType(strategy);
    const riskFactors = this.calculateRiskFactors(strategy);
    const complexityScore = this.calculateComplexityScore(strategy, strategyType);

    return {
      strategyAddress: strategy.strategyAddress,
      strategyType,
      totalAssets: strategy.totalAssets,
      apy: strategy.apy,
      underlying: strategy.underlying,
      riskFactors,
      complexityScore
    };
  }

  private identifyStrategyType(strategy: StrategyDetails): string {
    const protocols = strategy.underlying.map((u) => u.name.toLowerCase());
    if (protocols.includes('lending') && protocols.includes('rings')) return 'AaveRingsCarryStrategy';
    if (protocols.includes('eggs') && protocols.includes('shadow')) return 'EggsShadowLoopStrategy';
    if (protocols.includes('pendle')) return 'PendleFixedYieldStrategy';
    if (protocols.includes('rings') && protocols.includes('lending')) return 'RingsAaveLoopStrategy';
    if (protocols.includes('beets')) return 'StSBeetsStrategy';
    if (protocols.includes('swapx')) return 'SwapXManagedRangeStrategy';
    return 'UnknownStrategy';
  }

  private calculateRiskFactors(strategy: StrategyDetails): StrategyAnalysis['riskFactors'] {
    let liquidationRisk = 0;
    let protocolRisk = 0;
    let smartContractRisk = 0;
    let impermanentLossRisk = 0;
    let leverageRisk = 0;
    for (const protocol of strategy.underlying) {
      if ('healthFactor' in protocol && protocol.healthFactor !== null && protocol.healthFactor !== undefined) {
        if ((protocol.healthFactor as number) < 1.1) liquidationRisk += 0.8;
        else if ((protocol.healthFactor as number) < 1.3) liquidationRisk += 0.4;
        else if ((protocol.healthFactor as number) < 1.5) liquidationRisk += 0.1;
      }
      if ('borrowApy' in protocol && 'supplyApy' in protocol) {
        const spread = (protocol.borrowApy || 0) - (protocol.supplyApy || 0);
        if (spread > 500) protocolRisk += 0.3;
        leverageRisk += Math.min(0.5, spread / 1000);
      }
      switch (protocol.name.toLowerCase()) {
        case 'eggs':
        case 'pendle':
          smartContractRisk += 0.3; break;
        case 'shadow':
        case 'beets':
        case 'swapx':
          impermanentLossRisk += 0.4; smartContractRisk += 0.2; break;
        case 'rings':
        case 'lending':
          smartContractRisk += 0.1; break;
      }
    }
    return {
      liquidationRisk: Math.min(1, liquidationRisk),
      protocolRisk: Math.min(1, protocolRisk),
      smartContractRisk: Math.min(1, smartContractRisk),
      impermanentLossRisk: Math.min(1, impermanentLossRisk),
      leverageRisk: Math.min(1, leverageRisk)
    };
  }

  private calculateComplexityScore(strategy: StrategyDetails, strategyType: string): number {
    let complexity = 0;
    switch (strategyType) {
      case 'EggsShadowLoopStrategy': complexity += 0.9; break;
      case 'RingsAaveLoopStrategy':
      case 'AaveRingsCarryStrategy': complexity += 0.7; break;
      case 'PendleFixedYieldStrategy': complexity += 0.6; break;
      case 'SwapXManagedRangeStrategy': complexity += 0.5; break;
      case 'StSBeetsStrategy': complexity += 0.3; break;
      default: complexity += 0.2;
    }
    complexity += Math.min(0.3, strategy.underlying.length * 0.1);
    return Math.min(1, complexity);
  }

  private async makeAIAllocationDecision(
    strategies: StrategyAnalysis[],
    vaultId: Address
  ): Promise<RecommendedAllocation> {
    const allocationSchema = z.object({
      allocations: z.record(z.string(), z.number().min(0).max(10000)),
      reasoning: z.string(),
      confidence: z.number().min(0).max(1),
      expectedApy: z.number().min(0),
      riskScore: z.number().min(0).max(1),
      marketContext: z.string()
    });

    const prompt = this.buildAllocationPrompt(strategies);
    const { object: parsed } = await generateObject({
      model: this.model,
      schema: allocationSchema,
      system: 'You are a precise portfolio construction assistant specializing in DeFi yield strategies.',
      prompt,
      maxRetries: 2,
      temperature: 0.2,
    });

    // ensure 10,000 bps total
    const allocations = { ...parsed.allocations } as Record<string, number>;
    const total = Object.values(allocations).reduce((s, v) => s + v, 0);
    if (total !== 10000 && total > 0) {
      const scale = 10000 / total;
      for (const k of Object.keys(allocations)) allocations[k] = Math.round(allocations[k] * scale);
    }

    const response: RecommendedAllocation = {
      vaultId,
      recommendedAllocation: allocations,
      expectedApy: parsed.expectedApy,
      riskScore: parsed.riskScore,
      reasoning: parsed.reasoning,
      confidence: parsed.confidence,
      marketContext: parsed.marketContext
    };

    try {
      const chainId = Config.chainId;
      await AgentCache.saveDecision({
        chainId,
        vault: vaultId,
        allocations: response.recommendedAllocation,
        expectedApyBp: response.expectedApy,
        riskScore: response.riskScore,
        confidence: response.confidence,
        reasoning: response.reasoning,
        marketContext: response.marketContext,
      });
      await Repository.insertAgentDecision({
        chainId,
        vault: vaultId,
        allocations: response.recommendedAllocation,
        expectedApyBp: response.expectedApy,
        riskScore: response.riskScore,
        confidence: response.confidence,
        reasoning: response.reasoning,
        marketContext: response.marketContext,
      });
    } catch (e) {
      console.warn('[Agent] Failed to persist decision', e);
    }

    return response;
  }

  private buildAllocationPrompt(strategies: StrategyAnalysis[]): string {
    const currentDate = new Date().toISOString().split('T')[0];
    let prompt = `You are an expert DeFi yield strategist managing a vault allocation across sophisticated yield strategies on Sonic blockchain. Today is ${currentDate}.\n\n`;
    prompt += 'Your task is to optimally allocate 10,000 basis points (100%) across these strategies:\n\n';
    strategies.forEach((strategy, index) => {
      prompt += `Strategy ${index + 1}: ${strategy.strategyType} (${strategy.strategyAddress})\n`;
      prompt += `- Current APY: ${strategy.apy} basis points (${(strategy.apy / 100).toFixed(2)}%)\n`;
      prompt += `- Total Assets: ${strategy.totalAssets.toFixed(4)} tokens\n`;
      prompt += `- Complexity Score: ${strategy.complexityScore.toFixed(2)}/1.0\n`;
      prompt += `- Risk Factors:\n`;
      prompt += `  * Liquidation Risk: ${strategy.riskFactors.liquidationRisk.toFixed(2)}/1.0\n`;
      prompt += `  * Protocol Risk: ${strategy.riskFactors.protocolRisk.toFixed(2)}/1.0\n`;
      prompt += `  * Smart Contract Risk: ${strategy.riskFactors.smartContractRisk.toFixed(2)}/1.0\n`;
      prompt += `  * Impermanent Loss Risk: ${strategy.riskFactors.impermanentLossRisk.toFixed(2)}/1.0\n`;
      prompt += `  * Leverage Risk: ${strategy.riskFactors.leverageRisk.toFixed(2)}/1.0\n`;
      if (strategy.underlying.length > 0) {
        prompt += `- Underlying Protocols:\n`;
        strategy.underlying.forEach(protocol => {
          prompt += `  * ${protocol.name}`;
          if ('supplyApy' in protocol && protocol.supplyApy) prompt += ` (Supply: ${protocol.supplyApy}bp)`;
          if ('borrowApy' in protocol && protocol.borrowApy) prompt += ` (Borrow: ${protocol.borrowApy}bp)`;
          if ('healthFactor' in protocol && protocol.healthFactor) prompt += ` (Health: ${(protocol.healthFactor as number).toFixed(2)})`;
          if ('apr' in protocol && protocol.apr) prompt += ` (APR: ${protocol.apr}bp)`;
          prompt += `\n`;
        });
      }
      prompt += `\n`;
    });
    prompt += `Strategy Descriptions:\n`;
    prompt += `- AaveRingsCarryStrategy: Uses wS as collateral to borrow USDC, converts to scUSD for yield farming\n`;
    prompt += `- EggsShadowLoopStrategy: Complex leveraged strategy using Eggs Finance and Shadow DEX with multiple loops\n`;
    prompt += `- PendleFixedYieldStrategy: Fixed yield strategy selling future earnings upfront via Pendle\n`;
    prompt += `- RingsAaveLoopStrategy: Leveraged USDC->scUSD loop strategy using Rings and Aave\n`;
    prompt += `- StSBeetsStrategy: Simple S/stS liquidity provision on BEETS DEX\n`;
    prompt += `- SwapXManagedRangeStrategy: Concentrated liquidity with automated range management on SwapX\n\n`;
    prompt += `Allocation Guidelines:\n`;
    prompt += `1. Prioritize risk-adjusted returns over raw APY\n`;
    prompt += `2. Diversify across strategy types to reduce correlation risk\n`;
    prompt += `3. Limit exposure to high-leverage strategies (max 30% total)\n`;
    prompt += `4. Avoid strategies with health factors below 1.2 (liquidation risk)\n`;
    prompt += `5. Balance complexity - don't put more than 40% in highly complex strategies\n`;
    prompt += `6. Consider protocol risks and smart contract maturity\n`;
    prompt += `7. Factor in current market conditions and volatility\n\n`;
    prompt += `Provide:\n`;
    prompt += `- allocations: Record<strategy_address, basis_points> (must sum to 10000)\n`;
    prompt += `- reasoning: Detailed explanation of allocation decisions\n`;
    prompt += `- confidence: Your confidence in this allocation (0-1)\n`;
    prompt += `- expectedApy: Portfolio-weighted expected APY in basis points\n`;
    prompt += `- riskScore: Overall portfolio risk score (0-1, where 1 is highest risk)\n`;
    prompt += `- marketContext: Current market conditions assessment\n`;
    return prompt;
  }
}
