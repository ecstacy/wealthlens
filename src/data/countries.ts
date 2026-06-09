import type { Geography, Currency } from '../types';

export interface CountryOption {
  code: string;
  label: string;
  geography: Geography;
  currency: Currency;
}

// Country list mapped to the app's broad geography buckets (for charts) and a
// default currency. Currencies are limited to the four the app supports; where
// a country's real currency isn't supported (e.g. CHF), we fall back to EUR.
export const COUNTRIES: CountryOption[] = [
  { code: 'IN', label: 'India', geography: 'india', currency: 'INR' },
  { code: 'US', label: 'United States', geography: 'us', currency: 'USD' },
  { code: 'GB', label: 'United Kingdom', geography: 'europe', currency: 'GBP' },
  { code: 'DE', label: 'Germany', geography: 'europe', currency: 'EUR' },
  { code: 'FR', label: 'France', geography: 'europe', currency: 'EUR' },
  { code: 'NL', label: 'Netherlands', geography: 'europe', currency: 'EUR' },
  { code: 'IE', label: 'Ireland', geography: 'europe', currency: 'EUR' },
  { code: 'ES', label: 'Spain', geography: 'europe', currency: 'EUR' },
  { code: 'IT', label: 'Italy', geography: 'europe', currency: 'EUR' },
  { code: 'PT', label: 'Portugal', geography: 'europe', currency: 'EUR' },
  { code: 'BE', label: 'Belgium', geography: 'europe', currency: 'EUR' },
  { code: 'AT', label: 'Austria', geography: 'europe', currency: 'EUR' },
  { code: 'CH', label: 'Switzerland', geography: 'europe', currency: 'EUR' },
  { code: 'GLOBAL', label: 'Global / Other', geography: 'global', currency: 'USD' },
];

export function findCountry(label?: string | null): CountryOption | undefined {
  if (!label) return undefined;
  return COUNTRIES.find((c) => c.label === label || c.code === label);
}

// Best-effort: map a broad geography to a default country option.
export function countryForGeography(geo: Geography): CountryOption {
  if (geo === 'india') return COUNTRIES[0];
  if (geo === 'us') return COUNTRIES[1];
  if (geo === 'europe') return COUNTRIES.find((c) => c.code === 'DE')!;
  return COUNTRIES.find((c) => c.code === 'GLOBAL')!;
}
