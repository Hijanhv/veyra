import dotenv from 'dotenv';

dotenv.config();

function int(key: string, def: number): number {
  const v = process.env[key];
  if (!v) return def;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function float(key: string, def: number): number {
  const v = process.env[key];
  if (!v) return def;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

function str(key: string, def: string): string {
  const v = process.env[key];
  return v && v.length > 0 ? v : def;
}

export const Config = {
  // AI
  aiModel: str('AGENT_MODEL', 'claude-sonnet-4-20250514'),
  aiEnabled: Boolean(process.env.ANTHROPIC_API_KEY),
  chainId: int('CHAIN_ID', 146),

  // Rebalancing thresholds
  rebalanceThresholdBp: int('REBALANCE_THRESHOLD_BP', 500), // 5%
  rebalanceMinConfidence: float('REBALANCE_MIN_CONFIDENCE', 0.7),
  rebalanceGasLimit: int('REBALANCE_GAS_LIMIT', 500000),

  // Scheduler
  schedAnalysisCron: str('SCHED_ANALYSIS_CRON', '0 * * * *'),
  schedMonitorCron: str('SCHED_MONITOR_CRON', '30 * * * *'),

  // Recommendation caching / freshness
  recommendationRefreshHours: int('RECOMMENDATION_REFRESH_HOURS', 1),

  // Guidelines used in AI prompt (purely informational)
  guidelineMaxLeverageBp: int('AGENT_MAX_LEVERAGE_BP', 3000), // 30%
  guidelineMaxComplexBp: int('AGENT_MAX_COMPLEX_BP', 4000), // 40%
  guidelineMinHealthFactor: float('AGENT_MIN_HEALTH_FACTOR', 1.2),
};
