import { getDatabase } from '../db/database';

export interface Snapshot {
  date: string;
  value_inr: number;
}

/** Record (or overwrite) today's net-worth snapshot in canonical INR. */
export async function recordSnapshot(valueInr: number) {
  if (valueInr <= 0) return;
  const db = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  await db.runAsync(
    'INSERT OR REPLACE INTO portfolio_snapshots (date, value_inr) VALUES (?, ?)',
    today, valueInr
  );
}

/** Most recent snapshots (oldest → newest), capped at `limit`. */
export async function getSnapshots(limit = 60): Promise<Snapshot[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Snapshot>(
    'SELECT date, value_inr FROM portfolio_snapshots ORDER BY date DESC LIMIT ?',
    limit
  );
  return rows.reverse();
}
