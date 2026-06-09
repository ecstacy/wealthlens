import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Menu, TextInput, useTheme, List, Divider } from 'react-native-paper';
import { getDatabase } from '../db/database';
import type { Account, Currency } from '../types';

interface Props {
  value: Account | null;
  onChange: (account: Account) => void;
}

const ACCOUNT_TYPES: { value: Account['type']; label: string }[] = [
  { value: 'bank', label: 'Bank' },
  { value: 'brokerage', label: 'Brokerage' },
  { value: 'demat', label: 'Demat' },
  { value: 'mf_platform', label: 'MF Platform' },
  { value: 'crypto_exchange', label: 'Crypto Exchange' },
];

/** Pick an existing account (your own entries) or create a new one inline. */
export default function AccountSelector({ value, onChange }: Props) {
  const theme = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [adding, setAdding] = useState(false);

  // New-account form state
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('brokerage');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [typeMenu, setTypeMenu] = useState(false);
  const [curMenu, setCurMenu] = useState(false);

  const load = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name');
    setAccounts(rows);
    setAdding(rows.length === 0); // no accounts yet → show the create form
    return rows;
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createAccount = async () => {
    if (!name.trim()) return;
    const db = await getDatabase();
    const res = await db.runAsync(
      'INSERT INTO accounts (name, type, currency) VALUES (?, ?, ?)',
      name.trim(), type, currency
    );
    const created: Account = {
      id: res.lastInsertRowId as number,
      name: name.trim(),
      type,
      currency,
      created_at: new Date().toISOString(),
    };
    setName('');
    setAdding(false);
    await load();
    onChange(created);
  };

  return (
    <View>
      {accounts.length > 0 && !adding && (
        <View style={[styles.list, { borderColor: theme.colors.outline }]}>
          {accounts.map((a, i) => (
            <View key={a.id}>
              <List.Item
                title={a.name}
                description={`${a.type} · ${a.currency}`}
                onPress={() => onChange(a)}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                right={(props) =>
                  value?.id === a.id ? <List.Icon {...props} icon="check-circle" color={theme.colors.primary} /> : null
                }
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
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Menu
              visible={typeMenu}
              onDismiss={() => setTypeMenu(false)}
              anchor={<Button mode="outlined" onPress={() => setTypeMenu(true)} style={{ flex: 1 }}>{ACCOUNT_TYPES.find((t) => t.value === type)?.label}</Button>}
            >
              {ACCOUNT_TYPES.map((t) => (
                <Menu.Item key={t.value} title={t.label} onPress={() => { setType(t.value); setTypeMenu(false); }} />
              ))}
            </Menu>
            <Menu
              visible={curMenu}
              onDismiss={() => setCurMenu(false)}
              anchor={<Button mode="outlined" onPress={() => setCurMenu(true)} style={{ flex: 1 }}>{currency}</Button>}
            >
              {(['INR', 'EUR', 'USD', 'GBP'] as Currency[]).map((c) => (
                <Menu.Item key={c} title={c} onPress={() => { setCurrency(c); setCurMenu(false); }} />
              ))}
            </Menu>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {accounts.length > 0 && (
              <Button mode="text" onPress={() => setAdding(false)} style={{ flex: 1 }}>Cancel</Button>
            )}
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
