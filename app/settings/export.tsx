import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../../src/db/database';

export default function ExportScreen() {
  const theme = useTheme();
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setStatus('');
    try {
      const db = await getDatabase();
      const tables = ['accounts', 'holdings', 'sips', 'transactions', 'income', 'expenses', 'goals', 'goal_allocations', 'alerts'];

      const backup: Record<string, unknown[]> = {};
      for (const table of tables) {
        backup[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
      }

      backup._meta = [{ exported_at: new Date().toISOString(), version: 1 }];

      const json = JSON.stringify(backup, null, 2);
      const file = new File(Paths.cache, `wealthlens-backup-${Date.now()}.json`);
      file.create();
      file.write(json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export WealthLens Backup' });
        setStatus('Backup shared successfully');
      } else {
        setStatus('Backup saved successfully');
      }
    } catch (e) {
      setStatus('Export failed. Please try again.');
    }
    setExporting(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>Export Data</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            Export all your financial data as a JSON file. You can use this to restore your data on another device or after reinstalling.
          </Text>
          <Button mode="contained" onPress={handleExport} loading={exporting}>Export Backup</Button>
          {status ? <Text style={{ color: theme.colors.secondary, marginTop: 12 }}>{status}</Text> : null}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 12 },
});
