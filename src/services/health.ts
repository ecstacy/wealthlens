import type { EnrichedHolding } from './market';

export interface Health {
  score: number;
  label: string;
  tips: string[];
}

/** On-device portfolio health score (0-100) from diversification heuristics. */
export function computeHealth(enriched: EnrichedHolding[]): Health {
  const total = enriched.reduce((s, h) => s + h.current_value, 0);
  if (total <= 0 || enriched.length === 0) {
    return { score: 0, label: 'No data', tips: ['Add holdings to see your score.'] };
  }

  let score = 100;
  const tips: string[] = [];
  const byClass: Record<string, number> = {};
  const byGeo: Record<string, number> = {};
  enriched.forEach((h) => {
    byClass[h.asset_class] = (byClass[h.asset_class] || 0) + h.current_value;
    byGeo[h.geography] = (byGeo[h.geography] || 0) + h.current_value;
  });

  const classes = Object.keys(byClass).length;
  if (classes < 2) { score -= 15; tips.push('Add other asset classes (debt, gold) to diversify.'); }
  else if (classes < 3) { score -= 8; tips.push('Consider a third asset class for resilience.'); }

  const topPct = (Math.max(...enriched.map((h) => h.current_value)) / total) * 100;
  if (topPct > 20) { score -= 15; tips.push('A single holding exceeds 20% — trim concentration.'); }
  else if (topPct > 15) { score -= 8; tips.push('A holding exceeds 15% — watch concentration risk.'); }

  const eqPct = ((byClass.equity || 0) / total) * 100;
  if (Math.abs(eqPct - 65) > 25) {
    score -= 10;
    tips.push(eqPct < 65 ? 'Equity is below the ~65% target for your age.' : 'Equity is well above target — consider rebalancing.');
  }

  if (Object.keys(byGeo).length < 2) { score -= 8; tips.push('All in one region — add geographic diversity.'); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Needs attention';
  return { score, label, tips };
}
