import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, SegmentedButtons, Menu, Switch } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { getDatabase } from '../src/db/database';
import { expenseCategories } from '../src/theme';
import type { Expense, Currency } from '../src/types';

const CATEGORIES = Object.keys(expenseCategories);

export default function AddExpenseScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [catMenu, setCatMenu] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      const db = await getDatabase();
      const r = await db.getFirstAsync<Expense>('SELECT * FROM expenses WHERE id = ?', Number(id));
      if (r) {
        setDescription(r.description); setCategory(r.category); setAmount(String(r.amount));
        setCurrency(r.currency); setDate(r.date); setRecurring(!!r.is_recurring);
        if (r.frequency && r.frequency !== 'one_time') setFrequency(r.frequency);
      }
    })();
  }, [id]);

  const save = async () => {
    if (!description.trim() || !amount) return;
    setSaving(true);
    const db = await getDatabase();
    const freq = recurring ? frequency : 'one_time';
    if (editing) {
      await db.runAsync(
        'UPDATE expenses SET description=?, category=?, amount=?, currency=?, date=?, is_recurring=?, frequency=? WHERE id=?',
        description.trim(), category, parseFloat(amount), currency, date, recurring ? 1 : 0, freq, Number(id)
      );
    } else {
      await db.runAsync(
        'INSERT INTO expenses (description, category, amount, currency, date, is_recurring, frequency) VALUES (?,?,?,?,?,?,?)',
        description.trim(), category, parseFloat(amount), currency, date, recurring ? 1 : 0, freq
      );
    }
    setSaving(false);
    router.back();
  };

  const remove = () => {
    Alert.alert('Delete expense', `Remove "${description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM expenses WHERE id = ?', Number(id));
        router.back();
      } },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginBottom: 16 }}>{editing ? 'Edit' : 'Add'} Expense</Text>

        <TextInput label="Description" value={description} onChangeText={setDescription} mode="outlined" style={styles.input} placeholder="e.g., Groceries" />

        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 4 }}>Category</Text>
        <Menu visible={catMenu} onDismiss={() => setCatMenu(false)}
          anchor={<Button mode="outlined" icon="chevron-down" contentStyle={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }} onPress={() => setCatMenu(true)}>{category}</Button>}>
          {CATEGORIES.map((c) => <Menu.Item key={c} title={c} onPress={() => { setCategory(c); setCatMenu(false); }} />)}
        </Menu>

        <TextInput label="Amount" value={amount} onChangeText={setAmount} mode="outlined" keyboardType="numeric" style={styles.input} />

        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 4 }}>Currency</Text>
        <SegmentedButtons value={currency} onValueChange={(v) => setCurrency(v as Currency)} buttons={[{ value: 'INR', label: 'INR' }, { value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }, { value: 'GBP', label: 'GBP' }]} />

        <TextInput label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} mode="outlined" style={styles.input} />

        <View style={styles.switchRow}>
          <Text style={{ color: theme.colors.onSurface }}>Recurring</Text>
          <Switch value={recurring} onValueChange={setRecurring} />
        </View>
        {recurring && (
          <SegmentedButtons value={frequency} onValueChange={(v) => setFrequency(v as any)} buttons={[{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'annual', label: 'Annual' }]} />
        )}

        <View style={[styles.row, { marginTop: 24 }]}>
          <Button mode="outlined" onPress={() => router.back()} style={{ flex: 1 }}>Cancel</Button>
          <Button mode="contained" onPress={save} loading={saving} disabled={!description.trim() || !amount} style={{ flex: 1 }}>Save</Button>
        </View>
        {editing && <Button mode="text" textColor={theme.colors.error} onPress={remove} style={{ marginTop: 12 }}>Delete</Button>}
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
