import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { getDatabase } from '../src/db/database';
import SecuritySearchField from '../src/components/SecuritySearchField';
import type { SecurityResult } from '../src/services/search';
import type { Account } from '../src/types';

type Frequency = 'weekly' | 'monthly' | 'quarterly';

function computeNextDate(from: Date, freq: Frequency): string {
  const d = new Date(from);
  if (freq === 'weekly') d.setDate(d.getDate() + 7);
  else if (freq === 'quarterly') d.setMonth(d.getMonth() + 3);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export default function AddSipScreen() {
  const theme = useTheme();
  const [selected, setSelected] = useState<SecurityResult | null>(null);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selected || !amount) return;
    setSaving(true);
    const db = await getDatabase();

    // Ensure an account exists.
    let acct = await db.getFirstAsync<Account>('SELECT * FROM accounts LIMIT 1');
    if (!acct) {
      await db.runAsync('INSERT INTO accounts (name, type, currency) VALUES (?, ?, ?)', 'My Portfolio', 'mf_platform', 'INR');
      acct = await db.getFirstAsync<Account>('SELECT * FROM accounts LIMIT 1');
    }
    if (!acct) {
      setSaving(false);
      return;
    }

    // Find or create the holding this SIP feeds into.
    let holding = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM holdings WHERE symbol = ? LIMIT 1',
      selected.symbol
    );
    if (!holding) {
      const res = await db.runAsync(
        `INSERT INTO holdings (account_id, name, asset_type, asset_class, geography, symbol, quantity, avg_price, currency)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`,
        acct.id, selected.name, selected.assetType, selected.assetClass, selected.geography, selected.symbol, selected.currency
      );
      holding = { id: res.lastInsertRowId as number };
    }

    const today = new Date();
    const startDate = today.toISOString().slice(0, 10);
    const nextDate = computeNextDate(today, frequency);

    await db.runAsync(
      `INSERT INTO sips (holding_id, amount, currency, frequency, start_date, next_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      holding.id, parseFloat(amount), selected.currency, frequency, startDate, nextDate
    );

    setSaving(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginBottom: 16 }}>Add SIP</Text>

        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
          Choose the fund or security you invest into regularly.
        </Text>
        <SecuritySearchField modes={['fund', 'security']} onSelect={setSelected} />

        <TextInput
          label="Amount per installment"
          value={amount}
          onChangeText={setAmount}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          placeholder="e.g., 10000"
        />

        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>Frequency</Text>
        <SegmentedButtons
          value={frequency}
          onValueChange={(v) => setFrequency(v as Frequency)}
          buttons={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
          ]}
          style={{ marginTop: 8 }}
        />

        <View style={[styles.row, { marginTop: 24 }]}>
          <Button mode="outlined" onPress={() => router.back()} style={{ flex: 1 }}>Cancel</Button>
          <Button mode="contained" onPress={handleSave} loading={saving} disabled={!selected || !amount} style={{ flex: 1 }}>
            Save SIP
          </Button>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  input: { marginTop: 12 },
  row: { flexDirection: 'row', gap: 12 },
});
