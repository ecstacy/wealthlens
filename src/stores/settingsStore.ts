import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

type Currency = 'INR' | 'EUR' | 'USD' | 'GBP';

const HIDE_KEY = 'wealthlens_hide_values';
const CURRENCY_KEY = 'wealthlens_display_currency';

interface SettingsState {
  age: number;
  baseCurrency: Currency;
  displayCurrency: Currency;
  hideValues: boolean;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  darkMode: boolean;
  claudeApiKey: string | null;
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  setClaudeApiKey: (key: string) => Promise<void>;
  setHideValues: (hide: boolean) => Promise<void>;
  setDisplayCurrency: (c: Currency) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  age: 35,
  baseCurrency: 'INR',
  displayCurrency: 'INR',
  hideValues: true, // privacy-first: values hidden by default
  riskTolerance: 'moderate',
  darkMode: true,
  claudeApiKey: null,

  loadSettings: async () => {
    const [apiKey, hide, cur] = await Promise.all([
      SecureStore.getItemAsync('wealthlens_claude_key'),
      SecureStore.getItemAsync(HIDE_KEY),
      SecureStore.getItemAsync(CURRENCY_KEY),
    ]);
    set({
      claudeApiKey: apiKey,
      hideValues: hide === null ? true : hide === 'true',
      displayCurrency: (cur as Currency) || 'INR',
    });
  },

  updateSetting: async (key: string, value: string) => {
    set((state) => ({ ...state, [key]: value }));
  },

  setClaudeApiKey: async (key: string) => {
    await SecureStore.setItemAsync('wealthlens_claude_key', key);
    set({ claudeApiKey: key });
  },

  setHideValues: async (hide: boolean) => {
    await SecureStore.setItemAsync(HIDE_KEY, String(hide));
    set({ hideValues: hide });
  },

  setDisplayCurrency: async (c: Currency) => {
    await SecureStore.setItemAsync(CURRENCY_KEY, c);
    set({ displayCurrency: c });
  },
}));
