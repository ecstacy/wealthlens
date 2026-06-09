import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, SegmentedButtons, Switch } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [selected, setSelected] = useState<SecurityResult | null>(null);
  const [holdingName, setHoldingName] = useState(''); // for edit display
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      const db = await getDatabase();
      const sip = await db.getFirstAsync<{ amount: number; frequency: Frequency; is_active: number; holding_id: number }>(
        'SELECT amount, frequency, is_active, holding_id FROM sips WHERE id = ?', Number(id)
      );
      if (sip) {
        setAmount(String(sip.amount));
        setFrequency(sip.frequency);
        setActive(!!sip.is_active);
        const h = await db.getFirstAsync<{ name: string }>('SELECT name FROM holdings WHERE id = ?', sip.holding_id);
        setHoldingName(h?.name ?? '');
      }
    })();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    const db = await getDatabase();

    if (editing) {
      await db.runAsync('UPDATE sips SET amount = ?, frequency = ?, is_active = ? WHERE id = ?',
        parseFloat(amount), frequency, active ? 1 : 0, Number(id));
      setSaving(false);
      router.back();
      return;
    }

    if (!selected || !amount) { setSaving(false); return; }

    let acct = await db.getFirstAsync<Account>('SELECT * FROM accounts LIMIT 1');
    if (!acct) {
      await db.runAsync('INSERT INTO accounts (name, type, currency) VALUES (?, ?, ?)', 'My Portfolio', 'mf_platform', 'INR');
      acct = await db.getFirstAsync<Account>('SELECT * FROM accounts LIMIT 1');
    }
    if (!acct) { setSaving(false); return; }

    let holding = await db.getFirstAsync<{ id: number }>('SELECT id FROM holdings WHERE symbol = ? LIMIT 1', selected.symbol);
    if (!holding) {
      const res = await db.runAsync(
        `INSERT INTO holdings (account_id, name, asset_type, asset_class, geography, country, symbol, quantity, avg_price, currency)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
        acct.id, selected.name, selected.assetType, selected.assetClass, selected.geography, selected.geography, selected.symbol, selected.currency
      );
      holding = { id: res.lastInsertRowId as number };
    }

    const today = new Date();
    await db.runAsync(
      `INSERT INTO sips (holding_id, amount, currency, frequency, start_date, next_date, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      holding.id, parseFloat(amount), selected.currency, frequency, today.toISOString().slice(0, 10), computeNextDate(today, frequency)
    );
    setSaving(false);
    router.back();
  };

  const remove = () => {
    Alert.alert('Delete SIP', `Stop tracking this SIP${holdingName ? ` into ${holdingName}` : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM sips WHERE id = ?', Number(id));
        router.back();
      } },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginBottom: 16 }}>{editing ? 'Edit' : 'Add'} SIP</Text>

        {editing ? (
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>{holdingName}</Text>
        ) : (
          <>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Choose the fund or security you invest into regularly.</Text>
            <SecuritySearchField modes={['fund', 'security']} onSelect={setSelected} />
          </>
        )}

        <TextInput label="Amount per installment" value={amount} onChangeText={setAmount} mode="outlined" keyboardType="numeric" style={styles.input} placeholder="e.g., 10000" />

        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>Frequency</Text>
        <SegmentedButtons value={frequency} onValueChange={(v) => setFrequency(v as Frequency)} buttons={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }]} style={{ marginTop: 8 }} />

        {editing && (
          <View style={styles.switchRow}>
            <Text style={{ color: theme.colors.onSurface }}>Active</Text>
            <Switch value={active} onValueChange={setActive} />
          </View>
        )}

        <View style={[styles.row, { marginTop: 24 }]}>
          <Button mode="outlined" onPress={() => router.back()} style={{ flex: 1 }}>Cancel</Button>
          <Button mode="contained" onPress={handleSave} loading={saving} disabled={(!editing && !selected) || !amount} style={{ flex: 1 }}>Save SIP</Button>
        </View>
        {editing && <Button mode="text" textColor={theme.colors.error} onPress={remove} style={{ marginTop: 12 }}>Delete SIP</Button>}
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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
});
