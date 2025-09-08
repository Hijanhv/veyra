import type { Address, BasisPoints } from './common.js';
import type { StrategyDetails } from './vault.js';

export interface RecommendedAllocation {
  vaultId: Address;
  recommendedAllocation: Record<Address, BasisPoints>;
  expectedApy: number; // bp
  riskScore: number;   // 0..1
  reasoning: string;
  confidence: number;  // 0..1
  marketContext: string;
}

export interface StrategyAnalysis {
  strategyAddress: Address;
  strategyName?: string;
  strategyType: string;
  totalAssets: number;
  apy: number; // bp
  underlying: StrategyDetails['underlying'];
  riskFactors: {
    liquidationRisk: number; // 0..1
    protocolRisk: number;    // 0..1
    smartContractRisk: number; // 0..1
    impermanentLossRisk: number; // 0..1
    leverageRisk: number; // 0..1
  };
  complexityScore: number; // 0..1
}
