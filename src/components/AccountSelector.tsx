import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Menu, TextInput, useTheme, List, Divider, IconButton, SegmentedButtons } from 'react-native-paper';
import { getDatabase } from '../db/database';
import type { Account, Currency } from '../types';

interface Props {
  value: Account | null;
  onChange: (account: Account | null) => void;
}

const ACCOUNT_TYPES: { value: Account['type']; label: string }[] = [
  { value: 'bank', label: 'Bank' },
  { value: 'brokerage', label: 'Brokerage' },
  { value: 'demat', label: 'Demat' },
  { value: 'mf_platform', label: 'MF Platform' },
  { value: 'crypto_exchange', label: 'Crypto Exchange' },
];

export default function AccountSelector({ value, onChange }: Props) {
  const theme = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [adding, setAdding] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('brokerage');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [typeMenu, setTypeMenu] = useState(false);

  const load = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name');
    setAccounts(rows);
    setAdding(rows.length === 0);
    return rows;
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createAccount = async () => {
    if (!name.trim()) return;
    const db = await getDatabase();
    const res = await db.runAsync('INSERT INTO accounts (name, type, currency) VALUES (?, ?, ?)', name.trim(), type, currency);
    const created: Account = { id: res.lastInsertRowId as number, name: name.trim(), type, currency, created_at: new Date().toISOString() };
    setName('');
    setAdding(false);
    await load();
    onChange(created);
  };

  const deleteAccount = async (a: Account) => {
    const db = await getDatabase();
    const cnt = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM holdings WHERE account_id = ?', a.id);
    const linked = cnt?.n ?? 0;
    const msg = linked > 0
      ? `"${a.name}" has ${linked} holding(s). Deleting it will also remove those holdings. Continue?`
      : `Delete "${a.name}"?`;
    Alert.alert('Delete account', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync('DELETE FROM accounts WHERE id = ?', a.id);
          if (value?.id === a.id) onChange(null);
          await load();
        },
      },
    ]);
  };

  return (
    <View>
      {accounts.length > 0 && !adding && (
        <View style={[styles.list, { borderColor: theme.colors.outline }]}>
          {accounts.map((a, i) => (
            <View key={a.id}>
              <List.Item
                title={a.name}
                description={`${ACCOUNT_TYPES.find((t) => t.value === a.type)?.label ?? a.type} · ${a.currency}`}
                onPress={() => onChange(a)}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                left={(props) =>
                  value?.id === a.id ? <List.Icon {...props} icon="check-circle" color={theme.colors.primary} /> : <List.Icon {...props} icon="circle-outline" color={theme.colors.onSurfaceVariant} />
                }
                right={() => (
                  <IconButton icon="trash-can-outline" size={20} iconColor={theme.colors.error} onPress={() => deleteAccount(a)} />
                )}
              />
              {i < accounts.length - 1 && <Divider style={{ backgroundColor: theme.colors.outline }} />}
            </View>
          ))}
        </View>
      )}

      {!adding ? (
        <Button mode="text" icon="plus" onPress={() => setAdding(true)} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
          Add new account
        </Button>
      ) : (
        <View style={[styles.form, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>New account</Text>

          <TextInput
            label="Bank / platform name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={{ marginTop: 8 }}
            placeholder="e.g., Zerodha, HDFC Bank, Trade Republic"
          />

          {/* Type — labeled dropdown */}
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 4 }}>Account type</Text>
          <Menu
            visible={typeMenu}
            onDismiss={() => setTypeMenu(false)}
            anchor={
              <Button
                mode="outlined"
                icon="chevron-down"
                contentStyle={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}
                style={{ borderColor: theme.colors.outline }}
                onPress={() => setTypeMenu(true)}
              >
                {ACCOUNT_TYPES.find((t) => t.value === type)?.label}
              </Button>
            }
          >
            {ACCOUNT_TYPES.map((t) => (
              <Menu.Item key={t.value} title={t.label} onPress={() => { setType(t.value); setTypeMenu(false); }} />
            ))}
          </Menu>

          {/* Currency — segmented (no hidden dropdown) */}
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 4 }}>Currency</Text>
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

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {accounts.length > 0 && <Button mode="text" onPress={() => setAdding(false)} style={{ flex: 1 }}>Cancel</Button>}
            <Button mode="contained" onPress={createAccount} disabled={!name.trim()} style={{ flex: 1 }}>Create</Button>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  form: { padding: 12, borderRadius: 12, marginTop: 8 },
});
