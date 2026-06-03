import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { List, useTheme, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function SettingsScreen() {
  const theme = useTheme();
  const { lock } = useAuthStore();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <List.Section>
        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>Security</List.Subheader>
        <List.Item
          title="Change PIN"
          left={(props) => <List.Icon {...props} icon="lock" />}
          onPress={() => router.push('/settings/security')}
          titleStyle={{ color: theme.colors.onSurface }}
        />
        <Divider />
        <List.Item
          title="Lock App"
          left={(props) => <List.Icon {...props} icon="lock-outline" />}
          onPress={lock}
          titleStyle={{ color: theme.colors.onSurface }}
        />
      </List.Section>

      <List.Section>
        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>AI & Data</List.Subheader>
        <List.Item
          title="Claude API Key"
          description="Required for AI-powered insights"
          left={(props) => <List.Icon {...props} icon="key" />}
          onPress={() => router.push('/settings/api-keys')}
          titleStyle={{ color: theme.colors.onSurface }}
          descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
        />
        <Divider />
        <List.Item
          title="Manage Accounts"
          description="Add or edit bank/brokerage accounts"
          left={(props) => <List.Icon {...props} icon="bank" />}
          onPress={() => router.push('/settings/accounts')}
          titleStyle={{ color: theme.colors.onSurface }}
          descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
        />
      </List.Section>

      <List.Section>
        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>Data</List.Subheader>
        <List.Item
          title="Export Backup"
          description="Save encrypted backup to device"
          left={(props) => <List.Icon {...props} icon="download" />}
          onPress={() => router.push('/settings/export')}
          titleStyle={{ color: theme.colors.onSurface }}
          descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
        />
        <Divider />
        <List.Item
          title="Import Backup"
          description="Restore from a previous backup"
          left={(props) => <List.Icon {...props} icon="upload" />}
          onPress={() => router.push('/settings/import')}
          titleStyle={{ color: theme.colors.onSurface }}
          descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
        />
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
