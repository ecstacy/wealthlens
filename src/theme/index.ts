import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const colors = {
  primary: '#6C9CFF',
  primaryContainer: '#1A2744',
  secondary: '#4ECDC4',
  secondaryContainer: '#1A3B38',
  tertiary: '#FFD93D',
  tertiaryContainer: '#3D3419',
  error: '#FF6B6B',
  errorContainer: '#3D1A1A',
  success: '#4ECDC4',
  warning: '#FFD93D',
  surface: '#0F1420',
  surfaceVariant: '#1A2030',
  background: '#0A0E1A',
  outline: '#2A3040',
  onPrimary: '#FFFFFF',
  onSurface: '#E8ECF4',
  onSurfaceVariant: '#9BA3B5',
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
  equity: '#6C9CFF',
  debt: '#4ECDC4',
  gold: '#FFD93D',
  crypto: '#FF6B9D',
  cash: '#9BA3B5',
  real_estate: '#B07CFF',
  india: '#FF9933',
  europe: '#003399',
  us: '#3A6FD8',
  global: '#4ECDC4',
};

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
