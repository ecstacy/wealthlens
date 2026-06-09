import type { AssetType, AssetClass } from '../types';

export interface HoldingCategory {
  key: string;
  label: string;
  icon: string;
  assetType: AssetType;
  assetClass: AssetClass;
  flow: 'search' | 'amount';
  searchMode?: 'security' | 'fund';
  hasInterest?: boolean;
  hasQuantity?: boolean;
}

export const HOLDING_CATEGORIES: HoldingCategory[] = [
  { key: 'stock', label: 'Stock / ETF', icon: 'chart-line', assetType: 'stock_global', assetClass: 'equity', flow: 'search', searchMode: 'security', hasQuantity: true },
  { key: 'fund', label: 'Mutual Fund', icon: 'chart-donut', assetType: 'mutual_fund', assetClass: 'equity', flow: 'search', searchMode: 'fund', hasQuantity: true },
  { key: 'crypto', label: 'Crypto', icon: 'bitcoin', assetType: 'crypto', assetClass: 'crypto', flow: 'search', searchMode: 'security', hasQuantity: true },
  { key: 'cash', label: 'Cash / Savings', icon: 'cash', assetType: 'cash', assetClass: 'cash', flow: 'amount', hasInterest: true },
  { key: 'fd', label: 'Fixed Deposit', icon: 'bank', assetType: 'fd', assetClass: 'debt', flow: 'amount', hasInterest: true },
  { key: 'ppf', label: 'PPF', icon: 'piggy-bank', assetType: 'ppf', assetClass: 'debt', flow: 'amount', hasInterest: true },
  { key: 'nps', label: 'NPS', icon: 'shield-account', assetType: 'nps', assetClass: 'equity', flow: 'amount', hasInterest: true },
  { key: 'sgb', label: 'Sovereign Gold Bond', icon: 'gold', assetType: 'sgb', assetClass: 'gold', flow: 'amount', hasInterest: true },
  { key: 'bond', label: 'Bond', icon: 'file-document-outline', assetType: 'bond', assetClass: 'debt', flow: 'amount', hasInterest: true },
];

// Asset types entered as a single amount (value = amount, quantity = 1) rather
// than quantity × price.
export const AMOUNT_ASSET_TYPES: AssetType[] = ['cash', 'fd', 'ppf', 'nps', 'sgb', 'bond'];

export const isAmountType = (t: AssetType) => AMOUNT_ASSET_TYPES.includes(t);
