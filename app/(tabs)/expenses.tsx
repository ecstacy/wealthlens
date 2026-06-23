import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, FAB, useTheme, Divider, SegmentedButtons } from 'react-native-paper';
import { BarChart } from 'react-native-gifted-charts';
import { router, useFocusEffect } from 'expo-router';
import { getDatabase } from '../../src/db/database';
import { expenseCategories } from '../../src/theme';
import { useMoney } from '../../src/hooks/useMoney';
import { prettyLabel, compactNumber } from '../../src/utils/labels';
import MoneyControls from '../../src/components/MoneyControls';
import ScreenHeader from '../../src/components/ScreenHeader';
import type { Expense } from '../../src/types';

export default function ExpensesScreen() {
  const theme = useTheme();
  const { fmt, fmtNum, convert } = useMoney();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('month');

  const loadData = useCallback(async () => {
    const db = await getDatabase();
    const now = new Date();
    let startDate: string;
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), q, 1).toISOString().split('T')[0];
    } else {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    }
    const rows = await db.getAllAsync<Expense>(
      'SELECT * FROM expenses WHERE date >= ? ORDER BY date DESC',
      startDate
    );
    setExpenses(rows);
  }, [period]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + convert(e.amount, e.currency), 0);

  const categoryTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + convert(e.amount, e.currency);
    });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({
        value: amount,
        label: cat.slice(0, 6),
        frontColor: expenseCategories[cat] || '#999',
      }));
  }, [expenses]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Expenses" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <MoneyControls />
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Total Spending</Text>
            <Text variant="headlineLarge" style={{ color: theme.colors.error, fontWeight: '700' }}>
              {fmtNum(totalExpenses)}
            </Text>
          </Card.Content>
        </Card>

        <SegmentedButtons
          value={period}
          onValueChange={setPeriod}
          buttons={[
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' },
          ]}
        />

        {categoryTotals.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>
                By Category
              </Text>
              <BarChart
                data={categoryTotals}
                barWidth={28}
                spacing={16}
                roundedTop
                noOfSections={3}
                formatYLabel={(v: string) => compactNumber(Number(v))}
                yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
                hideRules
                backgroundColor={theme.colors.surface}
              />
            </Card.Content>
          </Card>
        )}

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            {expenses.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No expenses recorded. Tap + to add.</Text>
            ) : (
              expenses.map((e) => (
                <Pressable key={e.id} onPress={() => router.push(`/add-expense?id=${e.id}`)}>
                  <View style={styles.row}>
                    <View style={[styles.catDot, { backgroundColor: expenseCategories[e.category] || '#999' }]} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>{e.description}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{prettyLabel(e.category)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.error }}>{fmt(e.amount, e.currency)}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatDate(e.date)}</Text>
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
        style={[styles.fab, { backgroundColor: theme.colors.error }]}
        color="#fff"
        onPress={() => router.push('/add-expense')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  card: { borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
