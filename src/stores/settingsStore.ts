import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

type Currency = 'INR' | 'EUR' | 'USD' | 'GBP';

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
  // Privacy-first: always start hidden each app launch. This is intentionally
  // NOT persisted — the "shown" state lives only in memory for the session, so
  // a fresh launch always requires tapping the eye to reveal values.
  hideValues: true,
  riskTolerance: 'moderate',
  darkMode: true,
  claudeApiKey: null,

  loadSettings: async () => {
    // Note: hideValues is deliberately not loaded — it resets to hidden on
    // each launch and is only toggled in-memory during a session.
    const [apiKey, cur] = await Promise.all([
      SecureStore.getItemAsync('wealthlens_claude_key'),
      SecureStore.getItemAsync(CURRENCY_KEY),
    ]);
    set({
      claudeApiKey: apiKey,
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
    // In-memory only — not persisted, so it resets to hidden next launch.
    set({ hideValues: hide });
  },

  setDisplayCurrency: async (c: Currency) => {
    await SecureStore.setItemAsync(CURRENCY_KEY, c);
    set({ displayCurrency: c });
  },
}));
