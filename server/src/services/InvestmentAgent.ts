import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { VaultService } from './VaultService.js';
import dotenv from 'dotenv';
import type { RecommendedAllocation, StrategyAnalysis } from '../types/ai.js';
import type { StrategyDetails } from '../types/vault.js';
import type { Address } from '../types/common.js';
import { Repository } from './db/Repository.js';

dotenv.config();

/**
 * What we return when someone asks for allocation advice.
 */

/**
 * AI-powered investment agent that makes sophisticated allocation decisions
 * using Claude Sonnet 4 to analyze DeFi strategies and market conditions
 */
export class InvestmentAgent {
  private aiModel = anthropic('claude-sonnet-4-20250514');

  constructor(private readonly vaultService: VaultService) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for AI decision making');
    }
  }

  /**
   * AI-powered allocation optimization using Claude Sonnet 4.
   * Analyzes complex DeFi strategies, market conditions, and risk factors.
   */
  async getOptimalAllocation(vaultId: string): Promise<RecommendedAllocation> {
    try {
      // Get detailed strategy information from blockchain
      const strategyDetails = await this.vaultService.getStrategyDetails(vaultId);

      // Enhance strategy data with risk analysis
      const enhancedStrategies = await Promise.all(
        strategyDetails.map(async (strategy) => this.analyzeStrategy(strategy))
      );

      // Use AI to make allocation decision
      const aiDecision = await this.makeAIAllocationDecision(enhancedStrategies, vaultId);

      return aiDecision;
    } catch (error) {
      console.error('AI allocation failed, falling back to simple algorithm:', error);
      return this.fallbackAllocation(vaultId);
    }
  }

  /**
   * Analyze a strategy to determine its type, risk factors, and complexity
   */
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

  /**
   * Identify the strategy type based on underlying protocols
   */
  private identifyStrategyType(strategy: StrategyDetails): string {
    const protocols = strategy.underlying.map((u) => u.name.toLowerCase());

    if (protocols.includes('lending') && protocols.includes('rings')) {
      return 'AaveRingsCarryStrategy';
    }
    if (protocols.includes('eggs') && protocols.includes('shadow')) {
      return 'EggsShadowLoopStrategy';
    }
    if (protocols.includes('pendle')) {
      return 'PendleFixedYieldStrategy';
    }
    if (protocols.includes('rings') && protocols.includes('lending')) {
      return 'RingsAaveLoopStrategy';
    }
    if (protocols.includes('beets')) {
      return 'StSBeetsStrategy';
    }
    if (protocols.includes('swapx')) {
      return 'SwapXManagedRangeStrategy';
    }

    return 'UnknownStrategy';
  }

  /**
   * Calculate comprehensive risk factors for a strategy
   */
  private calculateRiskFactors(strategy: StrategyDetails): StrategyAnalysis['riskFactors'] {
    let liquidationRisk = 0;
    let protocolRisk = 0;
    let smartContractRisk = 0;
    let impermanentLossRisk = 0;
    let leverageRisk = 0;

    // Analyze each underlying protocol
    for (const protocol of strategy.underlying) {
      // Liquidation risk from health factors
      if ('healthFactor' in protocol && protocol.healthFactor !== null && protocol.healthFactor !== undefined) {
        if ((protocol.healthFactor as number) < 1.1) {
          liquidationRisk += 0.8; // Very high risk
        } else if ((protocol.healthFactor as number) < 1.3) {
          liquidationRisk += 0.4; // Medium risk
        } else if ((protocol.healthFactor as number) < 1.5) {
          liquidationRisk += 0.1; // Low risk
        }
      }

      // Protocol risk based on type and borrowing costs
      if ('borrowApy' in protocol && 'supplyApy' in protocol) {
        const spread = (protocol.borrowApy || 0) - (protocol.supplyApy || 0);
        if (spread > 500) protocolRisk += 0.3; // High borrow costs
        leverageRisk += Math.min(0.5, spread / 1000); // Leverage risk from borrow/supply spread
      }

      // Smart contract risk based on protocol complexity
      switch (protocol.name.toLowerCase()) {
        case 'eggs':
        case 'pendle':
          smartContractRisk += 0.3; // Complex protocols
          break;
        case 'shadow':
        case 'beets':
        case 'swapx':
          impermanentLossRisk += 0.4; // DEX protocols have IL risk
          smartContractRisk += 0.2;
          break;
        case 'rings':
        case 'lending':
          smartContractRisk += 0.1; // Lower complexity protocols
          break;
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

  /**
   * Calculate strategy complexity score
   */
  private calculateComplexityScore(strategy: StrategyDetails, strategyType: string): number {
    let complexity = 0;

    // Base complexity by strategy type
    switch (strategyType) {
      case 'EggsShadowLoopStrategy':
        complexity += 0.9; // Very complex leveraged strategy
        break;
      case 'RingsAaveLoopStrategy':
      case 'AaveRingsCarryStrategy':
        complexity += 0.7; // Complex carry/loop strategies
        break;
      case 'PendleFixedYieldStrategy':
        complexity += 0.6; // Medium complexity yield tokenization
        break;
      case 'SwapXManagedRangeStrategy':
        complexity += 0.5; // Automated range management
        break;
      case 'StSBeetsStrategy':
        complexity += 0.3; // S/stS liquidity provision
        break;
      default:
        complexity += 0.2;
    }

    // Add complexity for multiple protocols
    complexity += Math.min(0.3, strategy.underlying.length * 0.1);

    return Math.min(1, complexity);
  }

  /**
   * Use Claude Sonnet 4 to make intelligent allocation decisions
   */
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

    const go = generateObject as unknown as (o: {
      model: unknown;
      schema: unknown;
      prompt: string;
    }) => Promise<{ object: z.infer<typeof allocationSchema> }>;

    const result = await go({
      model: this.aiModel,
      schema: allocationSchema,
      prompt
    });

    // Ensure allocations sum to 10000 basis points
    const { allocations } = result.object as { allocations: Record<string, number> };
    const totalAllocation = (Object.values(allocations) as number[]).reduce((sum: number, val: number) => sum + val, 0);
    if (totalAllocation !== 10000 && totalAllocation > 0) {
      const scaleFactor = 10000 / totalAllocation;
      (Object.keys(allocations) as string[]).forEach((key) => {
        allocations[key] = Math.round(allocations[key] * scaleFactor);
      });
    }

    const response = {
      vaultId,
      recommendedAllocation: allocations,
      expectedApy: result.object.expectedApy,
      riskScore: result.object.riskScore,
      reasoning: result.object.reasoning,
      confidence: result.object.confidence,
      marketContext: result.object.marketContext
    };

    // Persist decision off-chain for observability (if DB configured)
    try {
      const chainId = Number(process.env.CHAIN_ID || 0);
      await Repository.insertAgentDecision({
        chainId,
        vault: vaultId,
        allocations,
        expectedApyBp: response.expectedApy,
        riskScore: response.riskScore,
        confidence: response.confidence,
        reasoning: response.reasoning,
        marketContext: response.marketContext
      });
    } catch (e) {
      console.warn('[Agent] Failed to persist decision', e);
    }

    return response;
  }

  /**
   * Build detailed prompt for AI allocation decision
   */
  private buildAllocationPrompt(strategies: StrategyAnalysis[]): string {
    const currentDate = new Date().toISOString().split('T')[0];

    let prompt = `You are an expert DeFi yield strategist managing a vault allocation across sophisticated yield strategies on Sonic blockchain. Today is ${currentDate}.

Your task is to optimally allocate 10,000 basis points (100%) across these strategies:

`;

    strategies.forEach((strategy, index) => {
      prompt += `Strategy ${index + 1}: ${strategy.strategyType} (${strategy.strategyAddress})
`;
      prompt += `- Current APY: ${strategy.apy} basis points (${(strategy.apy / 100).toFixed(2)}%)
`;
      prompt += `- Total Assets: ${strategy.totalAssets.toFixed(4)} tokens
`;
      prompt += `- Complexity Score: ${strategy.complexityScore.toFixed(2)}/1.0
`;
      prompt += `- Risk Factors:
`;
      prompt += `  * Liquidation Risk: ${strategy.riskFactors.liquidationRisk.toFixed(2)}/1.0
`;
      prompt += `  * Protocol Risk: ${strategy.riskFactors.protocolRisk.toFixed(2)}/1.0
`;
      prompt += `  * Smart Contract Risk: ${strategy.riskFactors.smartContractRisk.toFixed(2)}/1.0
`;
      prompt += `  * Impermanent Loss Risk: ${strategy.riskFactors.impermanentLossRisk.toFixed(2)}/1.0
`;
      prompt += `  * Leverage Risk: ${strategy.riskFactors.leverageRisk.toFixed(2)}/1.0
`;

      if (strategy.underlying.length > 0) {
        prompt += `- Underlying Protocols:
`;
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

    prompt += `Strategy Descriptions:
`;
    prompt += `- AaveRingsCarryStrategy: Uses wS as collateral to borrow USDC, converts to scUSD for yield farming
`;
    prompt += `- EggsShadowLoopStrategy: Complex leveraged strategy using Eggs Finance and Shadow DEX with multiple loops
`;
    prompt += `- PendleFixedYieldStrategy: Fixed yield strategy selling future earnings upfront via Pendle
`;
    prompt += `- RingsAaveLoopStrategy: Leveraged USDC->scUSD loop strategy using Rings and Aave
`;
    prompt += `- StSBeetsStrategy: Simple S/stS liquidity provision on BEETS DEX
`;
    prompt += `- SwapXManagedRangeStrategy: Concentrated liquidity with automated range management on SwapX
`;
    prompt += `\n`;

    prompt += `Allocation Guidelines:
`;
    prompt += `1. Prioritize risk-adjusted returns over raw APY
`;
    prompt += `2. Diversify across strategy types to reduce correlation risk
`;
    prompt += `3. Limit exposure to high-leverage strategies (max 30% total)
`;
    prompt += `4. Avoid strategies with health factors below 1.2 (liquidation risk)
`;
    prompt += `5. Balance complexity - don't put more than 40% in highly complex strategies
`;
    prompt += `6. Consider protocol risks and smart contract maturity
`;
    prompt += `7. Factor in current market conditions and volatility
`;
    prompt += `\n`;

    prompt += `Return a JSON object with:
`;
    prompt += `- allocations: Record<strategy_address, basis_points> (must sum to 10000)
`;
    prompt += `- reasoning: Detailed explanation of allocation decisions
`;
    prompt += `- confidence: Your confidence in this allocation (0-1)
`;
    prompt += `- expectedApy: Portfolio-weighted expected APY in basis points
`;
    prompt += `- riskScore: Overall portfolio risk score (0-1, where 1 is highest risk)
`;
    prompt += `- marketContext: Current market conditions assessment
`;

    return prompt;
  }

  /**
   * Fallback allocation when AI fails - simple risk-adjusted algorithm
   */
  private async fallbackAllocation(vaultId: Address): Promise<RecommendedAllocation> {
    const details = await this.vaultService.getStrategyDetails(vaultId);
    const strategyAddrs = details.map((s) => s.strategyAddress);
    const allocs: Record<Address, number> = {};

    // Equal allocation as fallback
    const equalAlloc = Math.floor(10000 / strategyAddrs.length);
    const remainder = 10000 - (equalAlloc * strategyAddrs.length);

    strategyAddrs.forEach((addr, index) => {
      allocs[addr] = index === 0 ? equalAlloc + remainder : equalAlloc;
    });

    const avgApy = details.length > 0 ? details.reduce((sum, s) => sum + s.apy, 0) / details.length : 0;

    return {
      vaultId,
      recommendedAllocation: allocs,
      expectedApy: avgApy,
      riskScore: 0.5,
      reasoning: 'AI system unavailable. Using equal allocation fallback.',
      confidence: 0.3,
      marketContext: 'Unable to assess due to AI system unavailability'
    };
  }
}
