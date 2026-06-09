import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const colors = {
  primary: '#8B7CFF',
  primaryContainer: '#241E47',
  secondary: '#2DD4BF',
  secondaryContainer: '#0E3A36',
  tertiary: '#FBBF24',
  tertiaryContainer: '#3A2E0E',
  error: '#FB7185',
  errorContainer: '#3D1620',
  success: '#34D399',
  warning: '#FBBF24',
  surface: '#151B2E',
  surfaceVariant: '#1F2740',
  background: '#0B1020',
  outline: '#2C344E',
  onPrimary: '#FFFFFF',
  onSurface: '#EEF1FA',
  onSurfaceVariant: '#A4ADC6',
  onBackground: '#E8ECF4',
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...colors,
  },
  roundness: 12,
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#3A6FD8',
    primaryContainer: '#D6E3FF',
    secondary: '#2BA89E',
    secondaryContainer: '#C8F0EC',
    tertiary: '#D4A821',
    surface: '#F8F9FC',
    surfaceVariant: '#ECEEF4',
    background: '#FFFFFF',
    outline: '#D0D4DC',
    onPrimary: '#FFFFFF',
    onSurface: '#1A1C20',
    onSurfaceVariant: '#5A6070',
    onBackground: '#1A1C20',
    error: '#D32F2F',
    errorContainer: '#FFDAD6',
  },
  roundness: 12,
};

export const chartColors = {
  equity: '#8B7CFF',
  debt: '#2DD4BF',
  gold: '#FBBF24',
  crypto: '#F472B6',
  cash: '#94A3B8',
  real_estate: '#A78BFA',
  india: '#FB923C',
  europe: '#60A5FA',
  us: '#34D399',
  global: '#22D3EE',
};

// Vibrant palette for dynamic groupings (countries, etc.).
export const vibrantPalette = [
  '#8B7CFF', '#FB923C', '#2DD4BF', '#FBBF24', '#F472B6',
  '#60A5FA', '#34D399', '#22D3EE', '#A78BFA', '#FB7185',
];

export const expenseCategories: Record<string, string> = {
  housing: '#6C9CFF',
  food: '#4ECDC4',
  transport: '#FFD93D',
  utilities: '#FF6B9D',
  healthcare: '#B07CFF',
  entertainment: '#FF9933',
  shopping: '#FF6B6B',
  education: '#3A6FD8',
  insurance: '#9BA3B5',
  other: '#5A6070',
};
