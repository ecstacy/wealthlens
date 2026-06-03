import { getDatabase } from '../db/database';
import type { Currency, MarketCache, ExchangeRate } from '../types';

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const MF_API_BASE = 'https://api.mfapi.in/mf';
const EXCHANGE_RATE_BASE = 'https://open.er-api.com/v6/latest';

const CACHE_TTL_MS = 15 * 60 * 1000;

export async function fetchStockPrice(symbol: string): Promise<MarketCache | null> {
  const cached = await getCachedPrice(symbol);
  if (cached) return cached;

  try {
    const res = await fetch(`${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=1d`);
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    const entry: MarketCache = {
      symbol,
      price,
      change_pct: changePct,
      currency: meta.currency || 'USD',
      source: 'yahoo',
      fetched_at: new Date().toISOString(),
    };

    await cachePrice(entry);
    return entry;
  } catch {
    return getCachedPrice(symbol, true);
  }
}

export async function fetchMutualFundNAV(schemeCode: string): Promise<MarketCache | null> {
  const cacheKey = `MF_${schemeCode}`;
  const cached = await getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${MF_API_BASE}/${schemeCode}`);
    const data = await res.json();
    const latest = data.data?.[0];
    const prev = data.data?.[1];
    if (!latest) return null;

    const nav = parseFloat(latest.nav);
    const prevNav = prev ? parseFloat(prev.nav) : nav;
    const changePct = prevNav ? ((nav - prevNav) / prevNav) * 100 : 0;

    const entry: MarketCache = {
      symbol: cacheKey,
      price: nav,
      change_pct: changePct,
      currency: 'INR',
      source: 'mfapi',
      fetched_at: new Date().toISOString(),
    };

    await cachePrice(entry);
    return entry;
  } catch {
    return getCachedPrice(cacheKey, true);
  }
}

export async function fetchExchangeRate(from: Currency, to: Currency): Promise<number> {
  if (from === to) return 1;

  const pair = `${from}_${to}`;
  const db = await getDatabase();
  const cached = await db.getFirstAsync<ExchangeRate & { fetched_at: string }>(
    'SELECT * FROM exchange_rates WHERE pair = ?',
    pair
  );

  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
    return cached.rate;
  }

  try {
    const res = await fetch(`${EXCHANGE_RATE_BASE}/${from}`);
    const data = await res.json();
    const rate = data.rates?.[to];
    if (!rate) return cached?.rate ?? 1;

    await db.runAsync(
      'INSERT OR REPLACE INTO exchange_rates (pair, rate, fetched_at) VALUES (?, ?, datetime("now"))',
      pair, rate
    );
    return rate;
  } catch {
    return cached?.rate ?? 1;
  }
}

export async function convertToBase(amount: number, from: Currency, baseCurrency: Currency = 'INR'): Promise<number> {
  const rate = await fetchExchangeRate(from, baseCurrency);
  return amount * rate;
}

async function getCachedPrice(symbol: string, ignoreExpiry = false): Promise<MarketCache | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MarketCache>(
    'SELECT * FROM market_cache WHERE symbol = ?',
    symbol
  );
  if (!row) return null;
  if (!ignoreExpiry && Date.now() - new Date(row.fetched_at).getTime() > CACHE_TTL_MS) return null;
  return row;
}

async function cachePrice(entry: MarketCache) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO market_cache (symbol, price, change_pct, currency, source, fetched_at) VALUES (?, ?, ?, ?, ?, ?)',
    entry.symbol, entry.price, entry.change_pct, entry.currency, entry.source, entry.fetched_at
  );
}

export async function refreshAllPrices(holdings: { symbol: string | null; asset_type: string }[]) {
  const promises = holdings.map((h) => {
    if (!h.symbol) return null;
    if (h.asset_type === 'mutual_fund') return fetchMutualFundNAV(h.symbol);
    return fetchStockPrice(h.symbol);
  });
  await Promise.allSettled(promises.filter(Boolean) as Promise<MarketCache | null>[]);
}
