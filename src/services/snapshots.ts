import { getDatabase } from '../db/database';

export interface Snapshot {
  date: string;
  value_inr: number;
  breakdown?: string | null; // JSON: { india, europe, other } in INR
}

/** Record (or overwrite) today's net-worth snapshot in canonical INR. */
export async function recordSnapshot(valueInr: number, breakdown?: Record<string, number>) {
  if (valueInr <= 0) return;
  const db = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  await db.runAsync(
    'INSERT OR REPLACE INTO portfolio_snapshots (date, value_inr, breakdown) VALUES (?, ?, ?)',
    today, valueInr, breakdown ? JSON.stringify(breakdown) : null
  );
}

/** Most recent snapshots (oldest → newest), capped at `limit`. */
export async function getSnapshots(limit = 60): Promise<Snapshot[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Snapshot>(
    'SELECT date, value_inr, breakdown FROM portfolio_snapshots ORDER BY date DESC LIMIT ?',
    limit
  );
  return rows.reverse();
}
