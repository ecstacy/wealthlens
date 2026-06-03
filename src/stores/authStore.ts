import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

interface AuthState {
  isAuthenticated: boolean;
  isSetup: boolean;
  biometricsAvailable: boolean;
  biometricsEnabled: boolean;
  loading: boolean;
  checkSetup: () => Promise<void>;
  setupPin: (pin: string, enableBiometrics: boolean) => Promise<void>;
  authenticateWithPin: (pin: string) => Promise<boolean>;
  authenticateWithBiometrics: () => Promise<boolean>;
  lock: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isSetup: false,
  biometricsAvailable: false,
  biometricsEnabled: false,
  loading: true,

  checkSetup: async () => {
    const pin = await SecureStore.getItemAsync('wealthlens_pin');
    const bioPref = await SecureStore.getItemAsync('wealthlens_biometrics');
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    set({
      isSetup: !!pin,
      biometricsAvailable: hasHardware && isEnrolled,
      biometricsEnabled: bioPref === 'true',
      loading: false,
    });
  },

  setupPin: async (pin: string, enableBiometrics: boolean) => {
    await SecureStore.setItemAsync('wealthlens_pin', pin);
    await SecureStore.setItemAsync('wealthlens_biometrics', String(enableBiometrics));
    set({
      isSetup: true,
      isAuthenticated: true,
      biometricsEnabled: enableBiometrics,
    });
  },

  authenticateWithPin: async (pin: string) => {
    const stored = await SecureStore.getItemAsync('wealthlens_pin');
    if (pin === stored) {
      set({ isAuthenticated: true });
      return true;
    }
    return false;
  },

  authenticateWithBiometrics: async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock WealthLens',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: true,
    });
    if (result.success) {
      set({ isAuthenticated: true });
      return true;
    }
    return false;
  },

  lock: () => set({ isAuthenticated: false }),
}));
