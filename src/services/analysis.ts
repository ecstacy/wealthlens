import * as SecureStore from 'expo-secure-store';
import { getDatabase } from '../db/database';
import { convertToBase } from './market';
import type { Holding } from '../types';

interface PortfolioStructure {
  totalHoldings: number;
  allocationByClass: Record<string, number>;
  allocationByGeo: Record<string, number>;
  allocationByCountry: Record<string, number>;
  topConcentrations: { name: string; percentage: number }[];
  interestBearing: { name: string; rate: number }[];
  sipCount: number;
  monthlyCommitment: number;
}

export async function buildAnonymizedStructure(): Promise<PortfolioStructure> {
  const db = await getDatabase();
  const holdings = await db.getAllAsync<Holding>('SELECT * FROM holdings');

  // Convert each holding to INR so allocation percentages aren't skewed by currency.
  const valued = await Promise.all(
    holdings.map(async (h) => ({
      h,
      val: await convertToBase(h.quantity * h.avg_price, h.currency, 'INR'),
    }))
  );
  const totalValue = valued.reduce((s, v) => s + v.val, 0);

  const byClass: Record<string, number> = {};
  const byGeo: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const concentrations: { name: string; percentage: number }[] = [];
  const interestBearing: { name: string; rate: number }[] = [];

  valued.forEach(({ h, val }) => {
    const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
    byClass[h.asset_class] = (byClass[h.asset_class] || 0) + pct;
    byGeo[h.geography] = (byGeo[h.geography] || 0) + pct;
    const country = h.country || h.geography;
    byCountry[country] = (byCountry[country] || 0) + pct;
    concentrations.push({ name: h.asset_type, percentage: Math.round(pct) });
    if (h.interest_rate) interestBearing.push({ name: h.asset_type, rate: h.interest_rate });
  });

  const sips = await db.getAllAsync<{ amount: number }>('SELECT amount FROM sips WHERE is_active = 1');

  const round = (o: Record<string, number>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]));

  return {
    totalHoldings: holdings.length,
    allocationByClass: round(byClass),
    allocationByGeo: round(byGeo),
    allocationByCountry: round(byCountry),
    topConcentrations: concentrations.sort((a, b) => b.percentage - a.percentage).slice(0, 10),
    interestBearing,
    sipCount: sips.length,
    monthlyCommitment: sips.reduce((s, sip) => s + sip.amount, 0),
  };
}

export async function analysePortfolio(): Promise<string> {
  const apiKey = await SecureStore.getItemAsync('wealthlens_claude_key');
  if (!apiKey) return 'Please set your Claude API key in Settings to use AI analysis.';

  const structure = await buildAnonymizedStructure();
  if (structure.totalHoldings === 0) return 'Add some holdings first to get portfolio analysis.';

  const prompt = `You are a financial portfolio analyst. Analyse this portfolio structure for a 30-35 year old investor.

Portfolio Structure (percentages only, no actual amounts):
- Asset Allocation: ${JSON.stringify(structure.allocationByClass)}
- Geography Split: ${JSON.stringify(structure.allocationByGeo)}
- Country Split: ${JSON.stringify(structure.allocationByCountry)}
- Top Concentrations by type: ${JSON.stringify(structure.topConcentrations)}
- Interest-bearing holdings (% p.a.): ${JSON.stringify(structure.interestBearing)}
- Active SIPs: ${structure.sipCount}
- Total holdings: ${structure.totalHoldings}

Recommended allocation for age 30-35: 60-70% equity, 15-20% debt, 5-10% gold, 5% crypto.

Provide:
1. Portfolio health score (1-10)
2. Key strengths
3. Risks and gaps (concentration, missing asset classes, geography imbalance)
4. Top 3 actionable recommendations
5. Rebalancing suggestions

Keep it concise and actionable. Use bullet points.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.content?.[0]?.text) return data.content[0].text;
    if (data.error) return `Analysis error: ${data.error.message}`;
    return 'Unable to generate analysis. Please try again.';
  } catch (e) {
    return 'Network error. Please check your connection and try again.';
  }
}

export async function analyseOverlaps(): Promise<string> {
  const apiKey = await SecureStore.getItemAsync('wealthlens_claude_key');
  if (!apiKey) return 'Please set your Claude API key in Settings.';

  const db = await getDatabase();
  const mfs = await db.getAllAsync<Holding>(
    "SELECT * FROM holdings WHERE asset_type = 'mutual_fund'"
  );

  if (mfs.length < 2) return 'Add at least 2 mutual funds to check for overlaps.';

  const fundNames = mfs.map((f) => f.name);

  const prompt = `You are a mutual fund analyst. The investor holds these Indian mutual funds:
${fundNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Based on your knowledge of popular Indian mutual fund portfolios:
1. Identify likely stock overlaps between these funds
2. Estimate the overlap percentage between each pair
3. Flag any funds that are essentially duplicates
4. Suggest which fund(s) to consolidate or replace

Note: This is based on general knowledge of these funds' typical holdings. For exact overlap, the investor should check the latest factsheets.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return data.content?.[0]?.text || 'Unable to analyse overlaps.';
  } catch {
    return 'Network error. Please try again.';
  }
}

export async function forecastReturns(): Promise<string> {
  const apiKey = await SecureStore.getItemAsync('wealthlens_claude_key');
  if (!apiKey) return 'Please set your Claude API key in Settings.';

  const structure = await buildAnonymizedStructure();
  if (structure.totalHoldings === 0) return 'Add holdings to get return forecasts.';

  const prompt = `You are a financial planner. Based on this portfolio allocation, project returns for 5, 10, 15, and 20 year horizons.

Allocation: ${JSON.stringify(structure.allocationByClass)}

Use these historical CAGR assumptions:
- Indian equity: 12-14%
- Global equity: 8-10%
- Debt: 6-7%
- Gold: 8-9%
- Crypto: highly volatile, use 15% with high std dev

For each time horizon, provide:
1. Conservative estimate (25th percentile)
2. Expected return (50th percentile)
3. Optimistic estimate (75th percentile)

Express as growth multiples (e.g., 2.5x). Also note the impact of inflation (assume 6% for India).
Keep response concise with a table format.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return data.content?.[0]?.text || 'Unable to forecast returns.';
  } catch {
    return 'Network error. Please try again.';
  }
}
