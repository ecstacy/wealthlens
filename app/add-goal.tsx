import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, SegmentedButtons, List, Divider, Checkbox } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { getDatabase } from '../src/db/database';
import type { Goal, Currency, Holding } from '../src/types';

export default function AddGoalScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<Goal['priority']>('medium');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [linked, setLinked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      setHoldings(await db.getAllAsync<Holding>('SELECT id, name FROM holdings ORDER BY name'));
      if (editing) {
        const g = await db.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ?', Number(id));
        if (g) {
          setName(g.name); setTarget(String(g.target_amount)); setCurrency(g.currency);
          setTargetDate(g.target_date); setPriority(g.priority);
        }
        const allocs = await db.getAllAsync<{ holding_id: number }>('SELECT holding_id FROM goal_allocations WHERE goal_id = ?', Number(id));
        setLinked(new Set(allocs.map((a) => a.holding_id)));
      }
    })();
  }, [id]);

  const toggle = (hid: number) => {
    setLinked((prev) => {
      const next = new Set(prev);
      next.has(hid) ? next.delete(hid) : next.add(hid);
      return next;
    });
  };

  const save = async () => {
    if (!name.trim() || !target || !targetDate) return;
    setSaving(true);
    const db = await getDatabase();
    let goalId: number;
    if (editing) {
      goalId = Number(id);
      await db.runAsync('UPDATE goals SET name=?, target_amount=?, currency=?, target_date=?, priority=? WHERE id=?',
        name.trim(), parseFloat(target), currency, targetDate, priority, goalId);
    } else {
      const res = await db.runAsync('INSERT INTO goals (name, target_amount, currency, target_date, priority) VALUES (?,?,?,?,?)',
        name.trim(), parseFloat(target), currency, targetDate, priority);
      goalId = res.lastInsertRowId as number;
    }
    // Sync linked holdings.
    await db.runAsync('DELETE FROM goal_allocations WHERE goal_id = ?', goalId);
    for (const hid of linked) {
      await db.runAsync('INSERT INTO goal_allocations (goal_id, holding_id, percentage) VALUES (?, ?, 100)', goalId, hid);
    }
    setSaving(false);
    router.back();
  };

  const remove = () => {
    Alert.alert('Delete goal', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM goals WHERE id = ?', Number(id));
        router.back();
      } },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginBottom: 16 }}>{editing ? 'Edit' : 'Add'} Goal</Text>

        <TextInput label="Goal name" value={name} onChangeText={setName} mode="outlined" style={styles.input} placeholder="e.g., Retirement, Emergency Fund" />
        <TextInput label="Target amount" value={target} onChangeText={setTarget} mode="outlined" keyboardType="numeric" style={styles.input} />

        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 4 }}>Currency</Text>
        <SegmentedButtons value={currency} onValueChange={(v) => setCurrency(v as Currency)} buttons={[{ value: 'INR', label: 'INR' }, { value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }, { value: 'GBP', label: 'GBP' }]} />

        <TextInput label="Target date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} mode="outlined" style={styles.input} placeholder="2035-01-01" />

        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 4 }}>Priority</Text>
        <SegmentedButtons value={priority} onValueChange={(v) => setPriority(v as Goal['priority'])} buttons={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />

        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, marginTop: 20, marginBottom: 4 }}>Fund this goal with</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
          Linked holdings' live value tracks progress automatically.
        </Text>
        {holdings.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>No holdings yet — add some to track goal progress.</Text>
        ) : (
          <View style={[styles.list, { borderColor: theme.colors.outline }]}>
            {holdings.map((h, i) => (
              <View key={h.id}>
                <Checkbox.Item
                  label={h.name}
                  status={linked.has(h.id) ? 'checked' : 'unchecked'}
                  onPress={() => toggle(h.id)}
                  labelStyle={{ color: theme.colors.onSurface, fontSize: 14 }}
                  position="leading"
                />
                {i < holdings.length - 1 && <Divider style={{ backgroundColor: theme.colors.outline }} />}
              </View>
            ))}
          </View>
        )}

        <View style={[styles.row, { marginTop: 24 }]}>
          <Button mode="outlined" onPress={() => router.back()} style={{ flex: 1 }}>Cancel</Button>
          <Button mode="contained" onPress={save} loading={saving} disabled={!name.trim() || !target || !targetDate} style={{ flex: 1 }}>Save</Button>
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
  list: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
});
