import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface SettingsState {
  age: number;
  baseCurrency: 'INR' | 'EUR' | 'USD' | 'GBP';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  darkMode: boolean;
  claudeApiKey: string | null;
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  setClaudeApiKey: (key: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  age: 35,
  baseCurrency: 'INR',
  riskTolerance: 'moderate',
  darkMode: true,
  claudeApiKey: null,

  loadSettings: async () => {
    const apiKey = await SecureStore.getItemAsync('wealthlens_claude_key');
    set({ claudeApiKey: apiKey });
  },

  updateSetting: async (key: string, value: string) => {
    set((state) => ({ ...state, [key]: value }));
  },

  setClaudeApiKey: async (key: string) => {
    await SecureStore.setItemAsync('wealthlens_claude_key', key);
    set({ claudeApiKey: key });
  },
}));
