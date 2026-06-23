import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, useTheme, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getDatabase } from '../../src/db/database';
import { enrichHoldings, type EnrichedHolding } from '../../src/services/market';
import { recordSnapshot, getSnapshots } from '../../src/services/snapshots';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useMoney } from '../../src/hooks/useMoney';
import { prettyLabel } from '../../src/utils/labels';
import ScreenHeader from '../../src/components/ScreenHeader';
import { surfaces, MONO } from '../../src/theme';
import type { Holding } from '../../src/types';

const GAIN = '#4EDEA3';
const LOSS = '#FFB4AB';

export default function HomeScreen() {
  const theme = useTheme();
  const { hideValues, loadSettings } = useSettingsStore();
  const { fmt } = useMoney();

  const [holdings, setHoldings] = useState<EnrichedHolding[]>([]);
  const [recent, setRecent] = useState<Holding[]>([]);
  const [total, setTotal] = useState(0);
  const [invested, setInvested] = useState(0);
  const [sipCount, setSipCount] = useState(0);
  const [sipMonthly, setSipMonthly] = useState(0);
  const [vsMonth, setVsMonth] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    await loadSettings();
    const db = await getDatabase();
    const rows = await db.getAllAsync<Holding>('SELECT * FROM holdings ORDER BY created_at DESC');
    setRecent(rows.slice(0, 3));

    const apply = (e: EnrichedHolding[]) => {
      setHoldings(e);
      setTotal(e.reduce((s, h) => s + h.current_value, 0));
      setInvested(e.reduce((s, h) => s + h.invested_value, 0));
    };
    if (!force) apply(await enrichHoldings(rows, 'INR', false, true)); // instant from cache

    const sips = await db.getAllAsync<{ amount: number; frequency: string }>('SELECT amount, frequency FROM sips WHERE is_active = 1');
    setSipCount(sips.length);
    setSipMonthly(sips.reduce((s, x) => s + x.amount * (x.frequency === 'weekly' ? 52 / 12 : x.frequency === 'quarterly' ? 1 / 3 : 1), 0));

    const enriched = await enrichHoldings(rows, 'INR', force, false);
    apply(enriched);
    const tot = enriched.reduce((s, h) => s + h.current_value, 0);

    const region = { india: 0, europe: 0, other: 0 };
    enriched.forEach((h) => { region[h.geography === 'india' ? 'india' : h.geography === 'europe' ? 'europe' : 'other'] += h.current_value; });
    await recordSnapshot(tot, region);

    const snaps = await getSnapshots(90);
    if (snaps.length > 1 && tot > 0) {
      const cutoff = Date.now() - 28 * 86400000;
      const past = snaps.filter((s) => new Date(s.date).getTime() <= cutoff).pop() ?? snaps[0];
      if (past && past.value_inr > 0) setVsMonth(((tot - past.value_inr) / past.value_inr) * 100);
    }
  }, [loadSettings]);

  useFocusEffect(useCallback(() => { load(false); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(true); setRefreshing(false); };

  const byClass = React.useMemo(() => {
    const m: Record<string, number> = {};
    holdings.forEach((h) => { m[h.asset_class] = (m[h.asset_class] || 0) + h.current_value; });
    return m;
  }, [holdings]);

  const regions = React.useMemo(() => {
    const m: Record<string, number> = {};
    holdings.forEach((h) => { const k = h.country || h.geography; m[k] = (m[k] || 0) + h.current_value; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 2);
  }, [holdings]);

  const Dots = () => (
    <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
      {[...Array(7)].map((_, i) => <View key={i} style={styles.dot} />)}
    </View>
  );

  const CategoryCard = ({ icon, label, title, value }: { icon: any; label: string; title: string; value: string }) => (
    <View style={[styles.catCard, { backgroundColor: surfaces.base }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={[styles.iconWrap, { backgroundColor: surfaces.high }]}>
          <Ionicons name={icon} size={16} color={theme.colors.onSurfaceVariant} />
        </View>
        <Text style={styles.caps}>{label}</Text>
      </View>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 12 }}>{title}</Text>
      <Text style={{ color: theme.colors.onSurface, fontFamily: MONO, fontSize: 15, marginTop: 2 }}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title="WealthLens" brand showEye showSettings />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />}
      >
        {/* Net worth */}
        <View style={[styles.card, { backgroundColor: surfaces.low }]}>
          <Text style={styles.caps}>TOTAL NET WORTH</Text>
          {hideValues ? <Dots /> : (
            <Text style={{ color: theme.colors.onSurface, fontFamily: MONO, fontSize: 32, marginVertical: 4 }}>{fmt(total)}</Text>
          )}
          {vsMonth != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <View style={[styles.pill, { backgroundColor: 'rgba(78,222,163,0.15)' }]}>
                <Ionicons name={vsMonth >= 0 ? 'trending-up' : 'trending-down'} size={12} color={vsMonth >= 0 ? GAIN : LOSS} />
                <Text style={{ color: vsMonth >= 0 ? GAIN : LOSS, fontWeight: '700', fontSize: 12 }}>
                  {vsMonth >= 0 ? '+' : ''}{vsMonth.toFixed(1)}%
                </Text>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>vs last month</Text>
            </View>
          )}

          {/* Region mini-cards */}
          {regions.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              {regions.map(([name, val]) => (
                <View key={name} style={[styles.regionCard, { backgroundColor: surfaces.lowest }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{prettyLabel(name)}</Text>
                    <Ionicons name="globe-outline" size={14} color={theme.colors.onSurfaceVariant} />
                  </View>
                  {hideValues
                    ? <View style={{ flexDirection: 'row', gap: 4, marginVertical: 8 }}>{[...Array(4)].map((_, i) => <View key={i} style={styles.dotSm} />)}</View>
                    : <Text style={{ color: theme.colors.onSurface, fontFamily: MONO, fontSize: 14, marginVertical: 6 }}>{fmt(val)}</Text>}
                  <View style={styles.track}><View style={[styles.fill, { width: `${total > 0 ? Math.min((val / total) * 100, 100) : 0}%`, backgroundColor: theme.colors.secondary }]} /></View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Category grid */}
        <View style={styles.grid}>
          <CategoryCard icon="wallet-outline" label="LIQUID" title="Cash Reserves" value={fmt(byClass.cash || 0)} />
          <CategoryCard icon="stats-chart-outline" label="HIGH RISK" title="Equities" value={fmt(byClass.equity || 0)} />
          <CategoryCard icon="sync-outline" label="ACTIVE" title={`SIPs (${sipCount})`} value={fmt(sipMonthly)} />
          <CategoryCard icon="home-outline" label="ILLIQUID" title="Real Estate / Other" value={fmt((byClass.real_estate || 0) + (byClass.gold || 0) + (byClass.debt || 0))} />
        </View>

        {/* Quick actions (Income / Expenses live here now) */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable style={[styles.action, { backgroundColor: surfaces.base }]} onPress={() => router.push('/income')}>
            <Ionicons name="trending-up-outline" size={18} color={theme.colors.secondary} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Income</Text>
          </Pressable>
          <Pressable style={[styles.action, { backgroundColor: surfaces.base }]} onPress={() => router.push('/expenses')}>
            <Ionicons name="card-outline" size={18} color={theme.colors.error} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Expenses</Text>
          </Pressable>
        </View>

        {/* Recent activity */}
        <View style={[styles.card, { backgroundColor: surfaces.low }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Recent Holdings</Text>
            {holdings.length > 0 && <Pressable onPress={() => router.push('/holdings')}><Text style={{ color: theme.colors.secondary }}>View All</Text></Pressable>}
          </View>
          {recent.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>No holdings yet. Tap + to add your first investment.</Text>
          ) : recent.map((h, i) => (
            <View key={h.id}>
              <Pressable style={styles.activityRow} onPress={() => router.push(`/edit-holding?id=${h.id}`)}>
                <View style={[styles.iconWrap, { backgroundColor: surfaces.high }]}>
                  <Ionicons name="cube-outline" size={16} color={theme.colors.onSurfaceVariant} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>{h.name}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{prettyLabel(h.asset_type)} · {prettyLabel(h.country || h.geography)}</Text>
                </View>
              </Pressable>
              {i < recent.length - 1 && <Divider style={{ backgroundColor: theme.colors.outline, opacity: 0.5 }} />}
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Pressable style={[styles.fab, { backgroundColor: theme.colors.secondary }]} onPress={() => router.push('/add-holding')}>
        <Ionicons name="add" size={28} color={theme.colors.onSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  caps: { color: '#8F9098', fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: 'Inter_700Bold' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#44474D' },
  dotSm: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#44474D' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  regionCard: { flex: 1, borderRadius: 10, padding: 12 },
  track: { height: 4, borderRadius: 2, backgroundColor: '#2D3449', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: { width: '47.5%', flexGrow: 1, borderRadius: 12, padding: 14 },
  iconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  caps2: {},
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  fab: { position: 'absolute', right: 16, bottom: 80, width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
