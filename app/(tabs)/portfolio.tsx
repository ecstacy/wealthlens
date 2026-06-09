import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, FAB, useTheme, Chip, Divider, Button } from 'react-native-paper';
import { PieChart } from 'react-native-gifted-charts';
import { router, useFocusEffect } from 'expo-router';
import { getDatabase } from '../../src/db/database';
import { enrichHoldings, type EnrichedHolding } from '../../src/services/market';
import { chartColors } from '../../src/theme';
import type { Holding, AssetClass } from '../../src/types';

interface ActiveSip {
  id: number;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  next_date: string;
  holding_name: string;
}

const GAIN = '#22c55e';
const LOSS = '#ef4444';

export default function PortfolioScreen() {
  const theme = useTheme();
  const [holdings, setHoldings] = useState<EnrichedHolding[]>([]);
  const [sips, setSips] = useState<ActiveSip[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async (force = false) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Holding>('SELECT * FROM holdings ORDER BY asset_class, name');
    const enriched = await enrichHoldings(rows, 'INR', force);
    setHoldings(enriched);
    setTotalValue(enriched.reduce((s, h) => s + h.current_value, 0));
    setTotalInvested(enriched.reduce((s, h) => s + h.invested_value, 0));
    if (enriched.some((h) => h.is_live)) setLastUpdated(new Date());

    const sipRows = await db.getAllAsync<ActiveSip>(
      `SELECT sips.id, sips.amount, sips.currency, sips.frequency, sips.next_date, holdings.name AS holding_name
       FROM sips JOIN holdings ON holdings.id = sips.holding_id
       WHERE sips.is_active = 1
       ORDER BY sips.next_date`
    );
    setSips(sipRows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true); // force live prices on pull-to-refresh
    setRefreshing(false);
  };

  const totalGain = totalValue - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // Normalize each SIP to a monthly figure (assumes INR).
  const monthlyCommitment = sips.reduce((s, sip) => {
    const factor = sip.frequency === 'weekly' ? 52 / 12 : sip.frequency === 'quarterly' ? 1 / 3 : 1;
    return s + sip.amount * factor;
  }, 0);

  const allocationData = React.useMemo(() => {
    const byClass: Record<string, number> = {};
    holdings.forEach((h) => {
      byClass[h.asset_class] = (byClass[h.asset_class] || 0) + h.current_value;
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
      byGeo[h.geography] = (byGeo[h.geography] || 0) + h.current_value;
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
        {/* Net worth + live gain/loss */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Net Worth</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {refreshing ? 'Updating…' : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Pull to refresh prices'}
              </Text>
            </View>
            <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 2 }}>
              {formatCurrency(totalValue)}
            </Text>
            {totalInvested > 0 && (
              <Text variant="bodyMedium" style={{ color: totalGain >= 0 ? GAIN : LOSS, marginTop: 4 }}>
                {totalGain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(totalGain))} ({totalGainPct >= 0 ? '+' : ''}
                {totalGainPct.toFixed(2)}%)
              </Text>
            )}
          </Card.Content>
        </Card>

        {allocationData.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>Asset Allocation</Text>
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
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>Geography Split</Text>
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

        {/* SIPs */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>SIPs</Text>
              <Button mode="text" compact onPress={() => router.push('/add-sip')}>+ Add SIP</Button>
            </View>
            {sips.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                No active SIPs. Add one to track recurring investments.
              </Text>
            ) : (
              <>
                <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginTop: 4, marginBottom: 8 }}>
                  ≈ {formatCurrency(monthlyCommitment)}/month committed
                </Text>
                {sips.map((s) => (
                  <View key={s.id} style={styles.holdingRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>{s.holding_name}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {s.frequency} · next {s.next_date}
                      </Text>
                    </View>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                      {formatCurrency(s.amount)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Holdings */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 12 }}>Holdings</Text>
            {holdings.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No holdings yet. Tap + to add your first investment.</Text>
            ) : (
              holdings.map((h) => (
                <Pressable key={h.id} onPress={() => router.push(`/edit-holding?id=${h.id}`)}>
                  <View style={styles.holdingRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {h.is_live && <View style={[styles.liveDot, { backgroundColor: GAIN }]} />}
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>{h.name}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <Chip compact textStyle={{ fontSize: 10 }}>{h.asset_type}</Chip>
                        <Chip compact textStyle={{ fontSize: 10 }}>{h.country || h.geography}</Chip>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                        {formatCurrency(h.current_value)}
                      </Text>
                      {h.is_live ? (
                        <Text variant="bodySmall" style={{ color: h.gain_loss >= 0 ? GAIN : LOSS }}>
                          {h.gain_loss >= 0 ? '+' : ''}{h.gain_loss_pct.toFixed(1)}%
                          {h.change_pct != null ? ` · ${h.change_pct >= 0 ? '+' : ''}${h.change_pct.toFixed(1)}% today` : ''}
                        </Text>
                      ) : (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {h.currency !== 'INR' ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(h.avg_price * h.quantity)} ${h.currency}` : `${h.quantity} × ${formatCurrency(h.avg_price)}`}
                        </Text>
                      )}
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
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  holdingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
