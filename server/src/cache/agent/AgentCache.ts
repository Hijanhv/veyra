import { promises as fs } from 'fs';
import path from 'path';

type CacheDecision = {
  chainId: number;
  vault: string;
  allocations: Record<string, number>;
  expectedApyBp: number;
  riskScore: number;
  confidence: number;
  reasoning?: string;
  marketContext?: string;
  createdAt?: string;
};

const CACHE_FILE = path.resolve(process.cwd(), '.agent-cache.json');

export class AgentCache {
  static async saveDecision(d: CacheDecision): Promise<void> {
    const now = new Date().toISOString();
    const entry = { ...d, createdAt: d.createdAt ?? now };
    let list: CacheDecision[] = [];
    try {
      const raw = await fs.readFile(CACHE_FILE, 'utf8');
      list = JSON.parse(raw);
      if (!Array.isArray(list)) list = [];
    } catch { /* ignore */ }
    list.unshift(entry);
    // keep last 200 items
    if (list.length > 200) list = list.slice(0, 200);
    await fs.writeFile(CACHE_FILE, JSON.stringify(list, null, 2), 'utf8');
  }
}

