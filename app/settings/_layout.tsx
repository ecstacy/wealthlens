import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function SettingsLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="security" options={{ title: 'Security' }} />
      <Stack.Screen name="api-keys" options={{ title: 'API Keys' }} />
      <Stack.Screen name="accounts" options={{ title: 'Accounts' }} />
      <Stack.Screen name="export" options={{ title: 'Export Backup' }} />
      <Stack.Screen name="import" options={{ title: 'Import Backup' }} />
    </Stack>
  );
}
