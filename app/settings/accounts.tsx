import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, FAB, useTheme, TextInput, Button, SegmentedButtons, Dialog, Portal, Divider } from 'react-native-paper';
import { getDatabase } from '../../src/db/database';
import type { Account, Currency } from '../../src/types';

export default function AccountsScreen() {
  const theme = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('brokerage');
  const [currency, setCurrency] = useState<Currency>('INR');

  const loadData = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name');
    setAccounts(rows);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    const db = await getDatabase();
    await db.runAsync('INSERT INTO accounts (name, type, currency) VALUES (?, ?, ?)', name.trim(), type, currency);
    setName('');
    setShowDialog(false);
    loadData();
  };

  const handleDelete = async (id: number) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
    loadData();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {accounts.length === 0 ? (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>No accounts yet</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Tap + to add a bank or brokerage account</Text>
            </Card.Content>
          </Card>
        ) : (
          accounts.map((a) => (
            <Card key={a.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{a.name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {a.type} · {a.currency}
                    </Text>
                  </View>
                  <Button mode="text" textColor={theme.colors.error} onPress={() => handleDelete(a.id)} compact>
                    Delete
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => setShowDialog(true)}
      />

      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Title style={{ color: theme.colors.onSurface }}>Add Account</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Account Name" value={name} onChangeText={setName} mode="outlined" style={{ marginBottom: 12 }} />

            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Type</Text>
            <SegmentedButtons
              value={type}
              onValueChange={(v) => setType(v as Account['type'])}
              buttons={[
                { value: 'bank', label: 'Bank' },
                { value: 'brokerage', label: 'Broker' },
                { value: 'demat', label: 'Demat' },
                { value: 'mf_platform', label: 'MF' },
              ]}
              style={{ marginBottom: 12 }}
            />

            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Currency</Text>
            <SegmentedButtons
              value={currency}
              onValueChange={(v) => setCurrency(v as Currency)}
              buttons={[
                { value: 'INR', label: 'INR' },
                { value: 'EUR', label: 'EUR' },
                { value: 'USD', label: 'USD' },
                { value: 'GBP', label: 'GBP' },
              ]}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)}>Cancel</Button>
            <Button onPress={handleAdd} disabled={!name.trim()}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  card: { borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
