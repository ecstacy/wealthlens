import { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { fetchExchangeRate } from '../services/market';
import type { Currency } from '../types';

const LOCALES: Record<Currency, string> = { INR: 'en-IN', EUR: 'de-DE', USD: 'en-US', GBP: 'en-GB' };
const CURRENCIES: Currency[] = ['INR', 'EUR', 'USD', 'GBP'];

/**
 * Shared money formatting that respects the global privacy toggle and the
 * chosen display currency. `convert` returns a numeric value in the display
 * currency; `fmt` returns a masked/formatted string.
 */
export function useMoney() {
  const { hideValues, displayCurrency, loadSettings } = useSettingsStore();
  const [rates, setRates] = useState<Record<string, number>>({ INR: 1, EUR: 1, USD: 1, GBP: 1 });

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    let active = true;
    (async () => {
      const entries = await Promise.all(
        CURRENCIES.map(async (c) => [c, c === displayCurrency ? 1 : await fetchExchangeRate(c, displayCurrency)] as const)
      );
      if (active) setRates(Object.fromEntries(entries));
    })();
    return () => { active = false; };
  }, [displayCurrency]);

  const convert = (amount: number, from: Currency = 'INR') => amount * (rates[from] ?? 1);

  const fmtNum = (displayAmount: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat(LOCALES[displayCurrency], {
      style: 'currency',
      currency: displayCurrency,
      maximumFractionDigits: 0,
    }).format(displayAmount);
  };

  const fmt = (amount: number, from: Currency = 'INR') => fmtNum(convert(amount, from));

  return { fmt, fmtNum, convert, hideValues, displayCurrency };
}
