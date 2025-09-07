import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function getDb() {
  if (db) return db;
  const dataDir = path.resolve(process.cwd(), 'server', 'data');
  ensureDir(dataDir);
  const dbPath = path.join(dataDir, 'cache.sqlite');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vault_address TEXT NOT NULL,
      chain_id INTEGER,
      allocations_json TEXT NOT NULL,
      expected_apy_bp INTEGER NOT NULL,
      risk_score REAL NOT NULL,
      confidence REAL NOT NULL,
      reasoning TEXT,
      market_context TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_agent_decisions_vault_created
      ON agent_decisions (vault_address, created_at DESC);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  return db;
}

export type AgentDecisionRow = {
  id: number;
  vault_address: string;
  chain_id: number | null;
  allocations_json: string;
  expected_apy_bp: number;
  risk_score: number;
  confidence: number;
  reasoning: string | null;
  market_context: string | null;
  created_at: string;
};

