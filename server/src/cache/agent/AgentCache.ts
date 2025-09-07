import { getDb, type AgentDecisionRow } from '../sqlite.js';

export type Address = string;

export const AgentCache = {
  saveDecision(e: {
    chainId?: number | null;
    vault: Address;
    allocations: Record<Address, number>;
    expectedApyBp: number;
    riskScore: number;
    confidence: number;
    reasoning?: string;
    marketContext?: string;
  }) {
    const db = getDb();
    db.prepare(
      `INSERT INTO agent_decisions (
        vault_address, chain_id, allocations_json, expected_apy_bp, risk_score, confidence, reasoning, market_context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      e.vault,
      e.chainId ?? null,
      JSON.stringify(e.allocations),
      e.expectedApyBp,
      e.riskScore,
      e.confidence,
      e.reasoning ?? null,
      e.marketContext ?? null
    );
  },

  getLatest(vault: Address): AgentDecisionRow | null {
    const db = getDb();
    const row = db.prepare(
      `SELECT * FROM agent_decisions WHERE vault_address = ? ORDER BY datetime(created_at) DESC LIMIT 1`
    ).get(vault) as AgentDecisionRow | undefined;
    return row ?? null;
  },

  list(vault: Address, limit = 20): AgentDecisionRow[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT * FROM agent_decisions WHERE vault_address = ? ORDER BY datetime(created_at) DESC LIMIT ?`
      )
      .all(vault, limit) as AgentDecisionRow[];
  },
};

