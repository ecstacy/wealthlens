import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { getDatabase } from '../../src/db/database';

export default function ImportScreen() {
  const theme = useTheme();
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState('');

  const handleImport = async () => {
    setImporting(true);
    setStatus('');

    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) {
        setImporting(false);
        return;
      }

      const uri = result.assets[0].uri;
      const file = new File(uri);
      const json = await file.text();
      const backup = JSON.parse(json);

      if (!backup._meta) {
        setStatus('Invalid backup file');
        setImporting(false);
        return;
      }

      const db = await getDatabase();
      const tables = ['accounts', 'holdings', 'sips', 'transactions', 'income', 'expenses', 'goals', 'goal_allocations', 'alerts'];

      for (const table of tables) {
        if (!backup[table]) continue;
        for (const row of backup[table]) {
          const keys = Object.keys(row);
          const placeholders = keys.map(() => '?').join(', ');
          const values = keys.map((k) => row[k]);
          await db.runAsync(
            `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
            ...values
          );
        }
      }

      setStatus(`Imported successfully. ${backup._meta[0].exported_at}`);
    } catch (e) {
      setStatus('Import failed. Make sure the file is a valid WealthLens backup.');
    }
    setImporting(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>Import Backup</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            Restore your financial data from a previously exported backup file. This will merge with existing data.
          </Text>
          <Button mode="contained" onPress={handleImport} loading={importing}>Select Backup File</Button>
          {status ? <Text style={{ color: status.includes('failed') ? theme.colors.error : theme.colors.secondary, marginTop: 12 }}>{status}</Text> : null}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 12 },
});
