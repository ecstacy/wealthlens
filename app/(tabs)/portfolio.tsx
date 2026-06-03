import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, FAB, useTheme, Chip, Divider } from 'react-native-paper';
import { PieChart } from 'react-native-gifted-charts';
import { router } from 'expo-router';
import { getDatabase } from '../../src/db/database';
import { chartColors } from '../../src/theme';
import type { Holding, AssetClass } from '../../src/types';

export default function PortfolioScreen() {
  const theme = useTheme();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  const loadData = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Holding>('SELECT * FROM holdings ORDER BY asset_class, name');
    setHoldings(rows);

    const total = rows.reduce((sum, h) => sum + h.quantity * h.avg_price, 0);
    setTotalValue(total);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const allocationData = React.useMemo(() => {
    const byClass: Record<string, number> = {};
    holdings.forEach((h) => {
      const val = h.quantity * h.avg_price;
      byClass[h.asset_class] = (byClass[h.asset_class] || 0) + val;
    });
    return Object.entries(byClass).map(([key, value]) => ({
      value,
      color: chartColors[key as AssetClass] || '#999',
      text: key,
      label: `${key} ${totalValue > 0 ? Math.round((value / totalValue) * 100) : 0}%`,
    }));
  }, [holdings, totalValue]);

  const geoData = React.useMemo(() => {
    const byGeo: Record<string, number> = {};
    holdings.forEach((h) => {
      const val = h.quantity * h.avg_price;
      byGeo[h.geography] = (byGeo[h.geography] || 0) + val;
    });
    return Object.entries(byGeo).map(([key, value]) => ({
      value,
      color: chartColors[key as keyof typeof chartColors] || '#999',
      text: key,
      label: `${key} ${totalValue > 0 ? Math.round((value / totalValue) * 100) : 0}%`,
    }));
  }, [holdings, totalValue]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Net Worth</Text>
            <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {formatCurrency(totalValue)}
            </Text>
          </Card.Content>
        </Card>

        {allocationData.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>
                Asset Allocation
              </Text>
              <View style={styles.chartRow}>
                <PieChart data={allocationData} radius={70} innerRadius={45} innerCircleColor={theme.colors.surface} />
                <View style={styles.legendCol}>
                  {allocationData.map((d) => (
                    <View key={d.text} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{d.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {geoData.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>
                Geography Split
              </Text>
              <View style={styles.chartRow}>
                <PieChart data={geoData} radius={70} innerRadius={45} innerCircleColor={theme.colors.surface} />
                <View style={styles.legendCol}>
                  {geoData.map((d) => (
                    <View key={d.text} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{d.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 12 }}>Holdings</Text>
            {holdings.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No holdings yet. Tap + to add your first investment.</Text>
            ) : (
              holdings.map((h) => (
                <View key={h.id}>
                  <View style={styles.holdingRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>{h.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <Chip compact textStyle={{ fontSize: 10 }}>{h.asset_type}</Chip>
                        <Chip compact textStyle={{ fontSize: 10 }}>{h.geography}</Chip>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                        {formatCurrency(h.quantity * h.avg_price)}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {h.quantity} × {formatCurrency(h.avg_price)}
                      </Text>
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
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push('/add-holding')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  card: { borderRadius: 12 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  legendCol: { flex: 1, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  holdingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
