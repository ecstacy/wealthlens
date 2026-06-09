import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, FAB, useTheme, Chip, Divider, IconButton, Menu, Button } from 'react-native-paper';
import { PieChart, LineChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { getDatabase } from '../../src/db/database';
import { enrichHoldings, fetchExchangeRate, type EnrichedHolding } from '../../src/services/market';
import { recordSnapshot, getSnapshots, type Snapshot } from '../../src/services/snapshots';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { chartColors } from '../../src/theme';
import type { Holding, AssetClass, Currency } from '../../src/types';

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
const LOCALES: Record<Currency, string> = { INR: 'en-IN', EUR: 'de-DE', USD: 'en-US', GBP: 'en-GB' };

export default function PortfolioScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { hideValues, displayCurrency, loadSettings, setHideValues, setDisplayCurrency } = useSettingsStore();

  const [holdings, setHoldings] = useState<EnrichedHolding[]>([]);
  const [sips, setSips] = useState<ActiveSip[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalValue, setTotalValue] = useState(0); // INR
  const [totalInvested, setTotalInvested] = useState(0); // INR
  const [cagr, setCagr] = useState<number | null>(null);
  const [displayRate, setDisplayRate] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [curMenu, setCurMenu] = useState(false);

  const loadData = useCallback(async (force = false) => {
    await loadSettings();
    const db = await getDatabase();
    const rows = await db.getAllAsync<Holding>('SELECT * FROM holdings ORDER BY asset_class, name');
    const enriched = await enrichHoldings(rows, 'INR', force);
    setHoldings(enriched);

    const totVal = enriched.reduce((s, h) => s + h.current_value, 0);
    const totInv = enriched.reduce((s, h) => s + h.invested_value, 0);
    setTotalValue(totVal);
    setTotalInvested(totInv);

    // Est. CAGR weighted by how long each holding has been tracked.
    const now = Date.now();
    let wYears = 0;
    enriched.forEach((h) => {
      const years = Math.max((now - new Date(h.created_at).getTime()) / (365.25 * 86400000), 1 / 365);
      wYears += years * h.invested_value;
    });
    const avgYears = totInv > 0 ? wYears / totInv : 0;
    setCagr(totInv > 0 && avgYears > 0.08 && totVal > 0 ? (Math.pow(totVal / totInv, 1 / avgYears) - 1) * 100 : null);

    if (enriched.some((h) => h.is_live)) setLastUpdated(new Date());

    // Record + load history (canonical INR).
    await recordSnapshot(totVal);
    setSnapshots(await getSnapshots(60));

    // Display currency conversion.
    const { displayCurrency: cur } = useSettingsStore.getState();
    setDisplayRate(cur === 'INR' ? 1 : await fetchExchangeRate('INR', cur));

    const sipRows = await db.getAllAsync<ActiveSip>(
      `SELECT sips.id, sips.amount, sips.currency, sips.frequency, sips.next_date, holdings.name AS holding_name
       FROM sips JOIN holdings ON holdings.id = sips.holding_id WHERE sips.is_active = 1 ORDER BY sips.next_date`
    );
    setSips(sipRows);
  }, [loadSettings]);

  useFocusEffect(useCallback(() => { loadData(false); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const totalGain = totalValue - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const monthlyCommitment = sips.reduce((s, sip) => {
    const f = sip.frequency === 'weekly' ? 52 / 12 : sip.frequency === 'quarterly' ? 1 / 3 : 1;
    return s + sip.amount * f;
  }, 0);

  // format an INR amount into the chosen display currency, honoring privacy.
  const fmt = (inr: number) => {
    if (hideValues) return '••••••';
    const val = inr * displayRate;
    return new Intl.NumberFormat(LOCALES[displayCurrency], { style: 'currency', currency: displayCurrency, maximumFractionDigits: 0 }).format(val);
  };

  const allocationData = React.useMemo(() => {
    const by: Record<string, number> = {};
    holdings.forEach((h) => { by[h.asset_class] = (by[h.asset_class] || 0) + h.current_value; });
    return Object.entries(by).map(([k, v]) => ({ value: v, color: chartColors[k as AssetClass] || '#999', text: k, label: `${k} ${totalValue > 0 ? Math.round((v / totalValue) * 100) : 0}%` }));
  }, [holdings, totalValue]);

  const countryPalette = ['#6C9CFF', '#FF9933', '#4ECDC4', '#FFD93D', '#FF6B9D', '#B07CFF', '#003399', '#22c55e', '#ef4444', '#9BA3B5'];
  const countryData = React.useMemo(() => {
    const by: Record<string, number> = {};
    holdings.forEach((h) => {
      const key = h.country || h.geography; // precise country, falling back to region
      by[key] = (by[key] || 0) + h.current_value;
    });
    return Object.entries(by)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v], i) => ({ value: v, color: countryPalette[i % countryPalette.length], text: k, label: `${k} ${totalValue > 0 ? Math.round((v / totalValue) * 100) : 0}%` }));
  }, [holdings, totalValue]);

  const currencyColors: Record<string, string> = { INR: '#FF9933', EUR: '#003399', USD: '#22c55e', GBP: '#B07CFF' };
  const currencyData = React.useMemo(() => {
    const by: Record<string, number> = {};
    holdings.forEach((h) => { by[h.currency] = (by[h.currency] || 0) + h.current_value; });
    return Object.entries(by)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ value: v, color: currencyColors[k] || '#9BA3B5', text: k, label: `${k} ${totalValue > 0 ? Math.round((v / totalValue) * 100) : 0}%` }));
  }, [holdings, totalValue]);

  const trend = React.useMemo(
    () => snapshots.map((s) => ({ value: s.value_inr * displayRate })),
    [snapshots, displayRate]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* HERO */}
        <LinearGradient colors={['#22305C', '#141B2E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="labelLarge" style={{ color: '#A9B4D0' }}>Net Worth</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Menu
                visible={curMenu}
                onDismiss={() => setCurMenu(false)}
                anchor={<Button compact textColor="#A9B4D0" onPress={() => setCurMenu(true)} icon="chevron-down" contentStyle={{ flexDirection: 'row-reverse' }}>{displayCurrency}</Button>}
              >
                {(['INR', 'EUR', 'USD', 'GBP'] as Currency[]).map((c) => (
                  <Menu.Item key={c} title={c} onPress={async () => { setCurMenu(false); await setDisplayCurrency(c); loadData(false); }} />
                ))}
              </Menu>
              <IconButton icon={hideValues ? 'eye-off' : 'eye'} iconColor="#A9B4D0" size={20} onPress={() => setHideValues(!hideValues)} />
              <IconButton icon="cog-outline" iconColor="#A9B4D0" size={20} onPress={() => router.push('/settings')} />
            </View>
          </View>

          <Text variant="displaySmall" style={{ color: '#FFFFFF', fontWeight: '800' }}>{fmt(totalValue)}</Text>

          {totalInvested > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              <View style={[styles.pill, { backgroundColor: totalGain >= 0 ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)' }]}>
                <Text style={{ color: totalGain >= 0 ? GAIN : LOSS, fontWeight: '600' }}>
                  {totalGain >= 0 ? '▲' : '▼'} {fmt(Math.abs(totalGain))} ({totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(1)}%)
                </Text>
              </View>
              {cagr != null && (
                <View style={[styles.pill, { backgroundColor: 'rgba(108,156,255,0.18)' }]}>
                  <Text style={{ color: '#9DBEFF', fontWeight: '600' }}>Est. CAGR {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%</Text>
                </View>
              )}
            </View>
          )}
          <Text variant="labelSmall" style={{ color: '#6E7A99', marginTop: 8 }}>
            {refreshing ? 'Updating prices…' : lastUpdated ? `Live · updated ${lastUpdated.toLocaleTimeString()}` : 'Pull down to refresh prices'}
          </Text>
        </LinearGradient>

        {/* TRENDLINE */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>Performance</Text>
            {trend.length >= 2 ? (
              <LineChart
                data={trend}
                areaChart
                curved
                hideDataPoints
                color={theme.colors.primary}
                startFillColor={theme.colors.primary}
                endFillColor={theme.colors.surface}
                startOpacity={0.35}
                endOpacity={0.02}
                thickness={2}
                hideRules
                yAxisThickness={0}
                xAxisThickness={0}
                hideYAxisText={hideValues}
                yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 9 }}
                height={120}
                adjustToWidth
                initialSpacing={0}
                disableScroll
              />
            ) : (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Building history — your net worth is recorded each time you open this screen. Check back over the coming days to see the trend.
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

        {countryData.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>Country Split</Text>
              <View style={styles.chartRow}>
                <PieChart data={countryData} radius={70} innerRadius={45} innerCircleColor={theme.colors.surface} />
                <View style={styles.legendCol}>
                  {countryData.map((d) => (
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

        {currencyData.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>Currency Split</Text>
              <View style={styles.chartRow}>
                <PieChart data={currencyData} radius={70} innerRadius={45} innerCircleColor={theme.colors.surface} />
                <View style={styles.legendCol}>
                  {currencyData.map((d) => (
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
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>No active SIPs. Add one to track recurring investments.</Text>
            ) : (
              <>
                <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginTop: 4, marginBottom: 8 }}>≈ {fmt(monthlyCommitment)}/month committed</Text>
                {sips.map((s) => (
                  <Pressable key={s.id} onPress={() => router.push(`/add-sip?id=${s.id}`)} style={styles.holdingRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>{s.holding_name}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{s.frequency} · next {s.next_date}</Text>
                    </View>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{fmt(s.amount)}</Text>
                  </Pressable>
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
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>{fmt(h.current_value)}</Text>
                      {h.is_live ? (
                        <Text variant="bodySmall" style={{ color: h.gain_loss >= 0 ? GAIN : LOSS }}>
                          {h.gain_loss >= 0 ? '+' : ''}{h.gain_loss_pct.toFixed(1)}%{h.change_pct != null ? ` · ${h.change_pct >= 0 ? '+' : ''}${h.change_pct.toFixed(1)}% today` : ''}
                        </Text>
                      ) : (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{hideValues ? '•••' : `${h.currency}`}</Text>
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

      <FAB icon="plus" style={[styles.fab, { backgroundColor: theme.colors.primary }]} color={theme.colors.onPrimary} onPress={() => router.push('/add-holding')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  hero: { borderRadius: 20, padding: 20 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  card: { borderRadius: 16 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  legendCol: { flex: 1, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  holdingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
