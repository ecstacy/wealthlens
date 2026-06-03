export type Currency = 'INR' | 'EUR' | 'USD' | 'GBP';

export type AssetType =
  | 'stock_indian'
  | 'stock_global'
  | 'mutual_fund'
  | 'etf'
  | 'fd'
  | 'ppf'
  | 'nps'
  | 'sgb'
  | 'bond'
  | 'crypto'
  | 'cash';

export type AssetClass = 'equity' | 'debt' | 'gold' | 'crypto' | 'cash' | 'real_estate';

export type Geography = 'india' | 'europe' | 'us' | 'global';

export interface Account {
  id: number;
  name: string;
  type: 'bank' | 'brokerage' | 'demat' | 'crypto_exchange' | 'mf_platform';
  currency: Currency;
  created_at: string;
}

export interface Holding {
  id: number;
  account_id: number;
  name: string;
  asset_type: AssetType;
  asset_class: AssetClass;
  geography: Geography;
  symbol: string | null;
  isin: string | null;
  quantity: number;
  avg_price: number;
  currency: Currency;
  current_price?: number;
  current_value?: number;
  gain_loss?: number;
  gain_loss_pct?: number;
  created_at: string;
  updated_at: string;
}

export interface SIP {
  id: number;
  holding_id: number;
  amount: number;
  currency: Currency;
  frequency: 'monthly' | 'quarterly' | 'weekly';
  start_date: string;
  end_date: string | null;
  next_date: string;
  is_active: boolean;
}

export interface Transaction {
  id: number;
  holding_id: number;
  type: 'buy' | 'sell' | 'dividend' | 'interest' | 'bonus' | 'split';
  quantity: number;
  price: number;
  amount: number;
  currency: Currency;
  fees: number;
  date: string;
  notes: string | null;
}

export interface Income {
  id: number;
  source: string;
  category: 'salary' | 'freelance' | 'rental' | 'dividend' | 'interest' | 'capital_gains' | 'other';
  amount: number;
  currency: Currency;
  date: string;
  is_recurring: boolean;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time' | null;
}

export interface Expense {
  id: number;
  description: string;
  category: string;
  amount: number;
  currency: Currency;
  date: string;
  is_recurring: boolean;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time' | null;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  currency: Currency;
  target_date: string;
  priority: 'high' | 'medium' | 'low';
  current_amount?: number;
  progress_pct?: number;
}

export interface Alert {
  id: number;
  type: 'price' | 'rebalance' | 'sip_reminder' | 'news' | 'opportunity';
  holding_id: number | null;
  condition: string;
  threshold: number | null;
  is_active: boolean;
  last_triggered: string | null;
}

export interface MarketCache {
  symbol: string;
  price: number;
  change_pct: number;
  currency: Currency;
  source: string;
  fetched_at: string;
}

export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
  fetched_at: string;
}
