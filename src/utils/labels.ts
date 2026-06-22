// Human-readable labels for the enum-ish strings stored in the DB.
const MAP: Record<string, string> = {
  // asset types
  stock_indian: 'Indian Stock',
  stock_global: 'Global Stock',
  mutual_fund: 'Mutual Fund',
  etf: 'ETF',
  fd: 'Fixed Deposit',
  ppf: 'PPF',
  nps: 'NPS',
  sgb: 'Gold Bond',
  bond: 'Bond',
  crypto: 'Crypto',
  robo: 'Robo Advisor',
  cash: 'Cash',
  // asset classes
  equity: 'Equity',
  debt: 'Debt',
  gold: 'Gold',
  real_estate: 'Real Estate',
  // geography
  india: 'India',
  europe: 'Europe',
  us: 'US',
  global: 'Global',
  // account types
  bank: 'Bank',
  brokerage: 'Brokerage',
  demat: 'Demat',
  mf_platform: 'MF Platform',
  crypto_exchange: 'Crypto Exchange',
  robo_advisor: 'Robo Advisor',
  // income/expense categories
  salary: 'Salary',
  freelance: 'Freelance',
  rental: 'Rental',
  dividend: 'Dividend',
  interest: 'Interest',
  capital_gains: 'Capital Gains',
  housing: 'Housing',
  food: 'Food',
  transport: 'Transport',
  utilities: 'Utilities',
  healthcare: 'Healthcare',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  education: 'Education',
  insurance: 'Insurance',
  other: 'Other',
};

/** Turn a stored key like `mutual_fund` into a friendly label like `Mutual Fund`. */
export function prettyLabel(key?: string | null): string {
  if (!key) return '';
  if (MAP[key]) return MAP[key];
  // Fallback: replace underscores and title-case.
  return key
    .split('_')
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Compact money for chart axes: 1.2Cr / 3.4L / 56k. */
export function compactNumber(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${Math.round(v / 1e3)}k`;
  return `${Math.round(v)}`;
}
