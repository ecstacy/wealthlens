import * as SQLite from 'expo-sqlite';

// Single shared connection. We memoize the *promise* (not just the resolved
// handle) so concurrent callers during startup all await the same open +
// migration, instead of each racing to open its own connection.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync('wealthlens.db');
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(database);
  return database;
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase().catch((e) => {
      dbPromise = null; // allow a retry if init failed
      throw e;
    });
  }
  return dbPromise;
}

async function runMigrations(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const row = await database.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_version'
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion < 1) {
    await database.execAsync(MIGRATION_V1);
    await database.runAsync('INSERT OR IGNORE INTO schema_version (version) VALUES (?)', 1);
  }

  if (currentVersion < 2) {
    await database.execAsync(MIGRATION_V2);
    await database.runAsync('INSERT OR IGNORE INTO schema_version (version) VALUES (?)', 2);
  }

  if (currentVersion < 3) {
    await database.execAsync(MIGRATION_V3);
    await database.runAsync('INSERT OR IGNORE INTO schema_version (version) VALUES (?)', 3);
  }

  if (currentVersion < 4) {
    await database.execAsync(MIGRATION_V4);
    await database.runAsync('INSERT OR IGNORE INTO schema_version (version) VALUES (?)', 4);
  }
}

// v4: per-region breakdown (JSON) on snapshots for the region trendline.
const MIGRATION_V4 = `
  ALTER TABLE portfolio_snapshots ADD COLUMN breakdown TEXT;
`;

// v2: interest rate (cash/FD/PPF/NPS/bonds) and precise country for recommendations.
const MIGRATION_V2 = `
  ALTER TABLE holdings ADD COLUMN interest_rate REAL;
  ALTER TABLE holdings ADD COLUMN country TEXT;
`;

// v3: daily net-worth snapshots (canonical INR) for the portfolio trendline.
const MIGRATION_V3 = `
  CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    date TEXT PRIMARY KEY,
    value_inr REAL NOT NULL
  );
`;

const MIGRATION_V1 = `
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('bank','brokerage','demat','crypto_exchange','mf_platform')),
    currency TEXT NOT NULL DEFAULT 'INR' CHECK(currency IN ('INR','EUR','USD','GBP')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    asset_class TEXT NOT NULL CHECK(asset_class IN ('equity','debt','gold','crypto','cash','real_estate')),
    geography TEXT NOT NULL CHECK(geography IN ('india','europe','us','global')),
    symbol TEXT,
    isin TEXT,
    quantity REAL NOT NULL DEFAULT 0,
    avg_price REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    holding_id INTEGER NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK(frequency IN ('weekly','monthly','quarterly')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    next_date TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    holding_id INTEGER NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('buy','sell','dividend','interest','bonus','split')),
    quantity REAL NOT NULL DEFAULT 0,
    price REAL NOT NULL DEFAULT 0,
    amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    fees REAL NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('salary','freelance','rental','dividend','interest','capital_gains','other')),
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    date TEXT NOT NULL,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    frequency TEXT CHECK(frequency IN ('monthly','quarterly','annual','one_time'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    date TEXT NOT NULL,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    frequency TEXT CHECK(frequency IN ('monthly','quarterly','annual','one_time'))
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    target_date TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low'))
  );

  CREATE TABLE IF NOT EXISTS goal_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    holding_id INTEGER NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
    percentage REAL NOT NULL DEFAULT 100
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('price','rebalance','sip_reminder','news','opportunity')),
    holding_id INTEGER REFERENCES holdings(id) ON DELETE CASCADE,
    condition TEXT NOT NULL,
    threshold REAL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_triggered TEXT
  );

  CREATE TABLE IF NOT EXISTS market_cache (
    symbol TEXT PRIMARY KEY,
    price REAL NOT NULL,
    change_pct REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    source TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exchange_rates (
    pair TEXT PRIMARY KEY,
    rate REAL NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_holdings_account ON holdings(account_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_holding ON transactions(holding_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  CREATE INDEX IF NOT EXISTS idx_sips_holding ON sips(holding_id);
`;

export async function resetDatabase() {
  if (dbPromise) {
    try {
      const database = await dbPromise;
      await database.closeAsync();
    } catch {
      // ignore
    }
    dbPromise = null;
  }
  await SQLite.deleteDatabaseAsync('wealthlens.db');
}
