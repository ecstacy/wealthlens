import type { AssetType, AssetClass, Geography, Currency } from '../types';

export interface SecurityResult {
  symbol: string;
  name: string;
  exchange: string;
  quoteType: string;
  assetType: AssetType;
  assetClass: AssetClass;
  geography: Geography;
  currency: Currency;
  source: 'yahoo' | 'mfapi';
}

const YAHOO_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';
const MF_SEARCH = 'https://api.mfapi.in/mf/search';

// Map a Yahoo exchange code to geography + currency.
function mapExchange(exchange: string, symbol: string): { geography: Geography; currency: Currency } {
  const ex = (exchange || '').toUpperCase();

  // India
  if (ex === 'NSI' || ex === 'BSE' || symbol.endsWith('.NS') || symbol.endsWith('.BO')) {
    return { geography: 'india', currency: 'INR' };
  }
  // US
  if (['NMS', 'NYQ', 'PCX', 'ASE', 'NGM', 'NCM', 'BTS'].includes(ex)) {
    return { geography: 'us', currency: 'USD' };
  }
  // UK
  if (ex === 'LSE' || symbol.endsWith('.L')) {
    return { geography: 'europe', currency: 'GBP' };
  }
  // Eurozone exchanges
  if (['GER', 'FRA', 'BER', 'DUS', 'HAM', 'MUN', 'STU', 'PAR', 'AMS', 'BRU', 'MIL', 'MCE', 'LIS', 'IOB'].includes(ex)) {
    return { geography: 'europe', currency: 'EUR' };
  }
  // Crypto / fallback
  return { geography: 'global', currency: 'USD' };
}

function mapQuoteType(
  quoteType: string,
  geography: Geography
): { assetType: AssetType; assetClass: AssetClass } {
  switch ((quoteType || '').toUpperCase()) {
    case 'ETF':
      return { assetType: 'etf', assetClass: 'equity' };
    case 'MUTUALFUND':
      return { assetType: 'mutual_fund', assetClass: 'equity' };
    case 'CRYPTOCURRENCY':
      return { assetType: 'crypto', assetClass: 'crypto' };
    case 'EQUITY':
    default:
      return {
        assetType: geography === 'india' ? 'stock_indian' : 'stock_global',
        assetClass: 'equity',
      };
  }
}

export async function searchSecurities(query: string): Promise<SecurityResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const res = await fetch(
      `${YAHOO_SEARCH}?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&listsCount=0`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const data = await res.json();
    const quotes: any[] = data.quotes || [];

    return quotes
      .filter((quote) => quote.symbol && ['EQUITY', 'ETF', 'MUTUALFUND', 'CRYPTOCURRENCY'].includes(quote.quoteType))
      .map((quote) => {
        const { geography, currency } = mapExchange(quote.exchange, quote.symbol);
        const { assetType, assetClass } = mapQuoteType(quote.quoteType, geography);
        return {
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          exchange: quote.exchDisp || quote.exchange || '',
          quoteType: quote.quoteType,
          assetType,
          assetClass,
          geography,
          currency,
          source: 'yahoo' as const,
        };
      });
  } catch {
    return [];
  }
}

export async function searchMutualFunds(query: string): Promise<SecurityResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  try {
    const res = await fetch(`${MF_SEARCH}?q=${encodeURIComponent(q)}`);
    const data: { schemeCode: number; schemeName: string }[] = await res.json();

    return (data || []).slice(0, 25).map((scheme) => ({
      symbol: String(scheme.schemeCode),
      name: scheme.schemeName,
      exchange: 'AMFI',
      quoteType: 'MUTUALFUND',
      assetType: 'mutual_fund' as AssetType,
      assetClass: 'equity' as AssetClass,
      geography: 'india' as Geography,
      currency: 'INR' as Currency,
      source: 'mfapi' as const,
    }));
  } catch {
    return [];
  }
}
