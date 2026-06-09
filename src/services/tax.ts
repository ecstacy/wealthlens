import { getDatabase } from '../db/database';
import { enrichHoldings } from './market';
import type { Holding } from '../types';

export interface TaxEstimate {
  equityLtcgGain: number;
  equityStcgGain: number;
  cryptoGain: number;
  otherGain: number; // debt/gold — taxed at slab, not estimated here
  ltcgTaxable: number; // equity LTCG above the exemption
  equityLtcgTax: number;
  equityStcgTax: number;
  cryptoTax: number;
  totalGain: number;
  totalTax: number;
  lossTotal: number; // unrealized losses (available to offset)
}

// India FY26 equity rules used for the estimate.
const LTCG_EXEMPTION = 125000; // ₹1.25L exempt equity LTCG
const EQUITY_LTCG_RATE = 0.125;
const EQUITY_STCG_RATE = 0.20;
const CRYPTO_RATE = 0.30; // VDA flat rate

/**
 * Estimate tax on UNREALIZED gains as if everything were sold today.
 * Holding period is approximated from when each holding was added to the app.
 * This is an estimate for planning only — not tax advice.
 */
export async function estimateTax(): Promise<TaxEstimate> {
  const db = await getDatabase();
  const holdings = await db.getAllAsync<Holding>('SELECT * FROM holdings');
  const enriched = await enrichHoldings(holdings, 'INR');
  const now = Date.now();

  let equityLtcg = 0, equityStcg = 0, crypto = 0, other = 0, lossTotal = 0;

  enriched.forEach((h) => {
    const gain = h.gain_loss; // INR
    if (gain < 0) { lossTotal += gain; return; }
    const years = (now - new Date(h.created_at).getTime()) / (365.25 * 86400000);
    const isLong = years >= 1;
    if (h.asset_class === 'crypto') crypto += gain;
    else if (h.asset_class === 'equity') (isLong ? (equityLtcg += gain) : (equityStcg += gain));
    else other += gain;
  });

  const ltcgTaxable = Math.max(0, equityLtcg - LTCG_EXEMPTION);
  const equityLtcgTax = ltcgTaxable * EQUITY_LTCG_RATE;
  const equityStcgTax = equityStcg * EQUITY_STCG_RATE;
  const cryptoTax = crypto * CRYPTO_RATE;

  return {
    equityLtcgGain: equityLtcg,
    equityStcgGain: equityStcg,
    cryptoGain: crypto,
    otherGain: other,
    ltcgTaxable,
    equityLtcgTax,
    equityStcgTax,
    cryptoTax,
    totalGain: equityLtcg + equityStcg + crypto + other,
    totalTax: equityLtcgTax + equityStcgTax + cryptoTax,
    lossTotal,
  };
}
