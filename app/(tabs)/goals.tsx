import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, FAB, useTheme, ProgressBar, Chip } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { getDatabase } from '../../src/db/database';
import { enrichHoldings, fetchExchangeRate } from '../../src/services/market';
import { useMoney } from '../../src/hooks/useMoney';
import MoneyControls from '../../src/components/MoneyControls';
import ScreenHeader from '../../src/components/ScreenHeader';
import type { Goal, Holding } from '../../src/types';

export default function GoalsScreen() {
  const theme = useTheme();
  const { fmt } = useMoney();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const db = await getDatabase();
    const goalRows = await db.getAllAsync<Goal>('SELECT * FROM goals ORDER BY priority, target_date');

    // Live progress: sum the current value of linked holdings (in INR), then
    // convert to each goal's currency.
    const holdingRows = await db.getAllAsync<Holding>('SELECT * FROM holdings');
    const enriched = await enrichHoldings(holdingRows, 'INR');
    const valById = new Map(enriched.map((h) => [h.id, h.current_value]));
    const allocs = await db.getAllAsync<{ goal_id: number; holding_id: number; percentage: number }>('SELECT * FROM goal_allocations');

    const withProgress = await Promise.all(
      goalRows.map(async (g) => {
        const linked = allocs.filter((a) => a.goal_id === g.id);
        const sumInr = linked.reduce((s, a) => s + (valById.get(a.holding_id) ?? 0) * (a.percentage / 100), 0);
        const rate = g.currency === 'INR' ? 1 : await fetchExchangeRate('INR', g.currency);
        return { ...g, current_amount: sumInr * rate };
      })
    );
    setGoals(withProgress);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const priorityColor = (p: string) =>
    p === 'high' ? theme.colors.error : p === 'medium' ? theme.colors.tertiary : theme.colors.onSurfaceVariant;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Forecast" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <MoneyControls />
        {goals.length === 0 ? (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
                Set Your Financial Goals
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                Define targets like retirement corpus, emergency fund, or a home purchase. The app will track your progress and suggest how to reach them.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          goals.map((g) => {
            const progress = (g.current_amount || 0) / g.target_amount;
            return (
              <Card key={g.id} style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={() => router.push(`/add-goal?id=${g.id}`)}>
                <Card.Content>
                  <View style={styles.goalHeader}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>{g.name}</Text>
                    <Chip compact textStyle={{ fontSize: 10, color: priorityColor(g.priority) }}>{g.priority}</Chip>
                  </View>

                  <View style={styles.goalAmounts}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {fmt(g.current_amount || 0, g.currency)} of {fmt(g.target_amount, g.currency)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {daysUntil(g.target_date)} days left
                    </Text>
                  </View>

                  <ProgressBar
                    progress={Math.min(progress, 1)}
                    color={progress >= 1 ? theme.colors.secondary : theme.colors.primary}
                    style={{ height: 6, borderRadius: 3, marginTop: 8 }}
                  />

                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    {Math.round(progress * 100)}% complete
                  </Text>
                </Card.Content>
              </Card>
            );
          })
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.tertiary }]}
        color="#000"
        onPress={() => router.push('/add-goal')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  card: { borderRadius: 12 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  goalAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
