import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, FAB, useTheme, Chip, Divider, SegmentedButtons } from 'react-native-paper';
import { getDatabase } from '../../src/db/database';
import { useMoney } from '../../src/hooks/useMoney';
import MoneyControls from '../../src/components/MoneyControls';
import type { Income } from '../../src/types';

export default function IncomeScreen() {
  const theme = useTheme();
  const { fmt, fmtNum, convert } = useMoney();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const loadData = useCallback(async () => {
    const db = await getDatabase();
    let query = 'SELECT * FROM income ORDER BY date DESC';
    if (filter !== 'all') {
      query = `SELECT * FROM income WHERE category = '${filter}' ORDER BY date DESC`;
    }
    const rows = await db.getAllAsync<Income>(query);
    setIncomes(rows);
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalIncome = incomes.reduce((sum, i) => sum + convert(i.amount, i.currency), 0);
  const monthlyRecurring = incomes
    .filter((i) => i.is_recurring && i.frequency === 'monthly')
    .reduce((sum, i) => sum + convert(i.amount, i.currency), 0);

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <MoneyControls />
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
                <View key={inc.id}>
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
                </View>
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
        onPress={() => setShowForm(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, borderRadius: 12 },
  card: { borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
