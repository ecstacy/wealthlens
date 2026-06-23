import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';

// Vault & Vellum — institutional dark-navy wealth palette.
const colors = {
  primary: '#B8C7E5',
  onPrimary: '#223149',
  primaryContainer: '#0B1B32',
  onPrimaryContainer: '#7584A0',
  secondary: '#4EDEA3', // growth accent
  onSecondary: '#003824',
  secondaryContainer: '#00A572',
  onSecondaryContainer: '#00311F',
  tertiary: '#B7C8E1',
  tertiaryContainer: '#0B1C2F',
  error: '#FFB4AB',
  errorContainer: '#93000A',
  success: '#4EDEA3',
  warning: '#FBBF24',
  background: '#0B1326',
  surface: '#131B2E', // surface-container-low (cards)
  surfaceVariant: '#222A3D', // surface-container-high (recessed/inputs)
  surfaceDisabled: '#171F33',
  outline: '#44474D', // outline-variant (subtle borders)
  onSurface: '#DAE2FD',
  onSurfaceVariant: '#C5C6CE',
  onBackground: '#DAE2FD',
  elevation: {
    level0: 'transparent',
    level1: '#131B2E',
    level2: '#171F33',
    level3: '#1B2438',
    level4: '#222A3D',
    level5: '#2D3449',
  },
};

// Tonal surface ramp for layered "sunken/elevated" containers.
export const surfaces = {
  lowest: '#060E20',
  low: '#131B2E',
  base: '#171F33',
  high: '#222A3D',
  highest: '#2D3449',
  bright: '#31394D',
};

const fontConfig = configureFonts({
  config: {
    displayLarge: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 56, fontSize: 48 },
    displayMedium: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const, lineHeight: 44, fontSize: 36 },
    displaySmall: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const, lineHeight: 36, fontSize: 30 },
    headlineLarge: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const, lineHeight: 40, fontSize: 32 },
    headlineMedium: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const, lineHeight: 32, fontSize: 24 },
    headlineSmall: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const, lineHeight: 28, fontSize: 22 },
    titleLarge: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const, lineHeight: 28, fontSize: 20 },
    titleMedium: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const, lineHeight: 24, fontSize: 16 },
    titleSmall: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const, lineHeight: 20, fontSize: 14 },
    bodyLarge: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const, lineHeight: 28, fontSize: 16 },
    bodyMedium: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const, lineHeight: 22, fontSize: 14 },
    bodySmall: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const, lineHeight: 18, fontSize: 12 },
    labelLarge: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const, lineHeight: 20, fontSize: 14 },
    labelMedium: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const, lineHeight: 16, fontSize: 12, letterSpacing: 0.5 },
    labelSmall: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const, lineHeight: 16, fontSize: 11, letterSpacing: 0.5 },
  },
});

export const MONO = 'JetBrainsMono_500Medium';

export const darkTheme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, ...colors },
  fonts: fontConfig,
  roundness: 3, // 12px on most Paper components (4px base × 3)
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#3A6FD8',
    secondary: '#00A572',
    surface: '#F8F9FC',
    background: '#FFFFFF',
    onSurface: '#1A1C20',
    onBackground: '#1A1C20',
  },
  fonts: fontConfig,
  roundness: 3,
};

// Chart palette tuned to the Vault & Vellum accents.
export const chartColors = {
  equity: '#4EDEA3',
  debt: '#B8C7E5',
  gold: '#FBBF24',
  crypto: '#F472B6',
  cash: '#7584A0',
  real_estate: '#B7C8E1',
  india: '#4EDEA3',
  europe: '#B8C7E5',
  us: '#60A5FA',
  global: '#22D3EE',
};

export const vibrantPalette = [
  '#4EDEA3', '#B8C7E5', '#FBBF24', '#F472B6', '#60A5FA',
  '#22D3EE', '#A78BFA', '#FB923C', '#34D399', '#7584A0',
];

export const expenseCategories: Record<string, string> = {
  housing: '#B8C7E5',
  food: '#4EDEA3',
  transport: '#FBBF24',
  utilities: '#F472B6',
  healthcare: '#A78BFA',
  entertainment: '#60A5FA',
  shopping: '#FB923C',
  education: '#22D3EE',
  insurance: '#7584A0',
  other: '#505F79',
};
