import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, FAB, useTheme, Chip, Divider, SegmentedButtons } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { getDatabase } from '../../src/db/database';
import { useMoney } from '../../src/hooks/useMoney';
import MoneyControls from '../../src/components/MoneyControls';
import type { Income, Expense } from '../../src/types';

export default function IncomeScreen() {
  const theme = useTheme();
  const { fmt, fmtNum, convert } = useMoney();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadData = useCallback(async () => {
    const db = await getDatabase();
    const rows = filter === 'all'
      ? await db.getAllAsync<Income>('SELECT * FROM income ORDER BY date DESC')
      : await db.getAllAsync<Income>('SELECT * FROM income WHERE category = ? ORDER BY date DESC', filter);
    setIncomes(rows);

    // This-month cashflow (all categories, regardless of filter).
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const incRows = await db.getAllAsync<Income>('SELECT amount, currency FROM income WHERE date >= ?', monthStart);
    const expRows = await db.getAllAsync<Expense>('SELECT amount, currency FROM expenses WHERE date >= ?', monthStart);
    setMonthIncome(incRows.reduce((s, i) => s + convert(i.amount, i.currency), 0));
    setMonthExpenses(expRows.reduce((s, e) => s + convert(e.amount, e.currency), 0));
  }, [filter, convert]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalIncome = incomes.reduce((sum, i) => sum + convert(i.amount, i.currency), 0);
  const monthlyRecurring = incomes
    .filter((i) => i.is_recurring && i.frequency === 'monthly')
    .reduce((sum, i) => sum + convert(i.amount, i.currency), 0);

  const monthNet = monthIncome - monthExpenses;
  const savingsRate = monthIncome > 0 ? (monthNet / monthIncome) * 100 : 0;
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });
  const GAIN = '#22c55e';
  const LOSS = '#ef4444';

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <MoneyControls />

        {/* Monthly cashflow & savings rate */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{monthName} Cashflow</Text>
              <View style={[styles.ratePill, { backgroundColor: savingsRate >= 0 ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)' }]}>
                <Text style={{ color: savingsRate >= 0 ? GAIN : LOSS, fontWeight: '700' }}>
                  {savingsRate >= 0 ? '' : '-'}{Math.abs(Math.round(savingsRate))}% saved
                </Text>
              </View>
            </View>

            <View style={styles.cashRow}>
              <View style={{ flex: 1 }}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Income</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.secondary }}>{fmtNum(monthIncome)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Expenses</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.error }}>{fmtNum(monthExpenses)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Net Saved</Text>
                <Text variant="titleMedium" style={{ color: monthNet >= 0 ? GAIN : LOSS }}>{fmtNum(monthNet)}</Text>
              </View>
            </View>

            {/* income vs expense bar */}
            <View style={styles.barTrack}>
              <View style={{ flex: Math.max(monthIncome, 1), backgroundColor: theme.colors.secondary, height: 8, borderRadius: 4 }} />
              <View style={{ flex: Math.max(monthExpenses, 0.0001), backgroundColor: theme.colors.error, height: 8, borderRadius: 4 }} />
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
              {monthIncome > 0
                ? `You're keeping ${Math.round(savingsRate)}% of your income this month.`
                : 'Add income and expenses to see your savings rate.'}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Total Income</Text>
              <Text variant="titleLarge" style={{ color: theme.colors.secondary, fontWeight: '700' }}>
                {fmtNum(totalIncome)}
              </Text>
            </Card.Content>
          </Card>
          <Card style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Monthly Recurring</Text>
              <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                {fmtNum(monthlyRecurring)}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <SegmentedButtons
            value={filter}
            onValueChange={setFilter}
            buttons={[
              { value: 'all', label: 'All' },
              { value: 'salary', label: 'Salary' },
              { value: 'freelance', label: 'Freelance' },
              { value: 'dividend', label: 'Dividend' },
              { value: 'rental', label: 'Rental' },
            ]}
          />
        </ScrollView>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            {incomes.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No income entries yet. Tap + to add.</Text>
            ) : (
              incomes.map((inc) => (
                <Pressable key={inc.id} onPress={() => router.push(`/add-income?id=${inc.id}`)}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>{inc.source}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <Chip compact textStyle={{ fontSize: 10 }}>{inc.category}</Chip>
                        {inc.is_recurring && <Chip compact textStyle={{ fontSize: 10 }}>{inc.frequency}</Chip>}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.secondary }}>{fmt(inc.amount, inc.currency)}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatDate(inc.date)}</Text>
                    </View>
                  </View>
                  <Divider style={{ backgroundColor: theme.colors.outline, marginVertical: 8 }} />
                </Pressable>
              ))
            )}
          </Card.Content>
        </Card>

        <View style={{ height: 80 }} />
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.secondary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push('/add-income')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, borderRadius: 12 },
  cashRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  ratePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  barTrack: { flexDirection: 'row', gap: 4, marginTop: 14 },
  card: { borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
