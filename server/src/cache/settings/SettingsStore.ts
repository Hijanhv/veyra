import { getDb } from '../sqlite.js';

export const SettingsStore = {
  get(key: string): string | undefined {
    const db = getDb();
    const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined;
    return row?.value;
  },
  set(key: string, value: string): void {
    const db = getDb();
    db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(key, value);
  },
};

