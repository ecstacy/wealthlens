import { getDatabase } from '../db/database';
import { enrichHoldings } from './market';
import { prettyLabel } from '../utils/labels';
import type { Holding, Income, Expense, Goal } from '../types';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/**
 * Build a plain-text portfolio summary the user can copy and paste into a
 * Claude chat (claude.ai) for analysis — avoiding API costs. All values are
 * in INR. This is the user's own data; nothing is sent anywhere by this code.
 */
export async function buildShareText(anonymized = false): Promise<string> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Holding>('SELECT * FROM holdings');
  const enriched = await enrichHoldings(rows, 'INR');
  const total = enriched.reduce((s, h) => s + h.current_value, 0);
  const invested = enriched.reduce((s, h) => s + h.invested_value, 0);

  const byClass: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byCurrency: Record<string, number> = {};
  enriched.forEach((h) => {
    byClass[h.asset_class] = (byClass[h.asset_class] || 0) + h.current_value;
    const c = h.country || h.geography;
    byCountry[c] = (byCountry[c] || 0) + h.current_value;
    byCurrency[h.currency] = (byCurrency[h.currency] || 0) + h.current_value;
  });

  const line = (m: Record<string, number>) =>
    Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${prettyLabel(k)} ${pct(v, total)}%`).join(', ');

  const L: string[] = [];
  L.push(anonymized ? '# Portfolio Summary (anonymized — percentages only)' : '# My Portfolio Summary (all values INR)');
  L.push('');
  if (anonymized) {
    L.push(`Overall gain: ${pct(total - invested, invested)}%  ·  ${enriched.length} holdings`);
  } else {
    L.push(`Net worth: ${inr(total)}  |  Invested: ${inr(invested)}  |  Gain: ${inr(total - invested)} (${pct(total - invested, invested)}%)`);
  }
  L.push('');
  L.push(`Asset allocation: ${line(byClass)}`);
  L.push(`Country split: ${line(byCountry)}`);
  L.push(`Currency exposure: ${line(byCurrency)}`);
  L.push('');
  L.push('## Holdings');
  [...enriched].sort((a, b) => b.current_value - a.current_value).forEach((h) => {
    if (anonymized) {
      // No names or amounts — type, region, weight, and return only.
      L.push(`- ${prettyLabel(h.asset_type)} (${prettyLabel(h.country || h.geography)}): ${pct(h.current_value, total)}% of portfolio, ${h.gain_loss >= 0 ? '+' : ''}${h.gain_loss_pct.toFixed(1)}%${h.interest_rate ? `, ${h.interest_rate}% p.a.` : ''}`);
    } else {
      L.push(`- ${h.name} (${prettyLabel(h.asset_type)}, ${prettyLabel(h.country || h.geography)}): ${inr(h.current_value)}, ${h.gain_loss >= 0 ? '+' : ''}${h.gain_loss_pct.toFixed(1)}%${h.interest_rate ? `, ${h.interest_rate}% p.a.` : ''}`);
    }
  });

  const sips = await db.getAllAsync<{ amount: number; frequency: string; name: string }>(
    `SELECT sips.amount, sips.frequency, holdings.name AS name FROM sips JOIN holdings ON holdings.id = sips.holding_id WHERE sips.is_active = 1`
  );
  if (sips.length) {
    L.push('');
    L.push('## Active SIPs');
    if (anonymized) L.push(`${sips.length} active SIPs.`);
    else sips.forEach((s) => L.push(`- ${s.name}: ${inr(s.amount)} ${s.frequency}`));
  }

  // This-month cashflow
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const inc = await db.getAllAsync<Income>('SELECT amount FROM income WHERE date >= ?', monthStart);
  const exp = await db.getAllAsync<Expense>('SELECT amount FROM expenses WHERE date >= ?', monthStart);
  const mIncome = inc.reduce((s, i) => s + i.amount, 0);
  const mExpense = exp.reduce((s, e) => s + e.amount, 0);
  if (mIncome || mExpense) {
    L.push('');
    L.push('## This month');
    L.push(anonymized
      ? `Savings rate ${pct(mIncome - mExpense, mIncome)}%`
      : `Income ${inr(mIncome)}, Expenses ${inr(mExpense)}, Savings rate ${pct(mIncome - mExpense, mIncome)}%`);
  }

  const goals = await db.getAllAsync<Goal>('SELECT name, target_amount, target_date FROM goals');
  if (goals.length) {
    L.push('');
    L.push('## Goals');
    if (anonymized) goals.forEach((g) => L.push(`- Goal by ${g.target_date}`));
    else goals.forEach((g) => L.push(`- ${g.name}: target ${inr(g.target_amount)} by ${g.target_date}`));
  }

  L.push('');
  L.push('Please analyse my portfolio: diversification, concentration/overlap risks, currency exposure, and suggest improvements for a 30-35 year old.');
  return L.join('\n');
}
