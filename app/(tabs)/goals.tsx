import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, useTheme, ProgressBar, Chip, SegmentedButtons, TextInput, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { router, useFocusEffect } from 'expo-router';
import { getDatabase } from '../../src/db/database';
import { enrichHoldings, fetchExchangeRate } from '../../src/services/market';
import { useMoney } from '../../src/hooks/useMoney';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { compactNumber } from '../../src/utils/labels';
import ScreenHeader from '../../src/components/ScreenHeader';
import { surfaces, MONO } from '../../src/theme';
import type { Goal, Holding } from '../../src/types';

type Risk = 'low' | 'mod' | 'high';
const RISK_RETURN: Record<Risk, number> = { low: 0.07, mod: 0.10, high: 0.13 };

export default function ForecastScreen() {
  const theme = useTheme();
  const { fmt, hideValues } = useMoney();
  const { age } = useSettingsStore();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentValue, setCurrentValue] = useState(0); // INR
  const [refreshing, setRefreshing] = useState(false);

  // Parameters
  const [currentAge, setCurrentAge] = useState(age || 35);
  const [retireAge, setRetireAge] = useState(60);
  const [risk, setRisk] = useState<Risk>('mod');
  const [monthly, setMonthly] = useState('');

  const loadData = useCallback(async () => {
    const db = await getDatabase();
    const holdingRows = await db.getAllAsync<Holding>('SELECT * FROM holdings');
    const enriched = await enrichHoldings(holdingRows, 'INR');
    setCurrentValue(enriched.reduce((s, h) => s + h.current_value, 0));

    // Default monthly savings = active SIP commitment, if user hasn't typed one.
    const sips = await db.getAllAsync<{ amount: number; frequency: string }>('SELECT amount, frequency FROM sips WHERE is_active = 1');
    const sipMonthly = sips.reduce((s, x) => s + x.amount * (x.frequency === 'weekly' ? 52 / 12 : x.frequency === 'quarterly' ? 1 / 3 : 1), 0);
    setMonthly((prev) => (prev === '' && sipMonthly > 0 ? String(Math.round(sipMonthly)) : prev));

    // Goals with live progress.
    const goalRows = await db.getAllAsync<Goal>('SELECT * FROM goals ORDER BY priority, target_date');
    const valById = new Map(enriched.map((h) => [h.id, h.current_value]));
    const allocs = await db.getAllAsync<{ goal_id: number; holding_id: number; percentage: number }>('SELECT * FROM goal_allocations');
    const withProgress = await Promise.all(goalRows.map(async (g) => {
      const linked = allocs.filter((a) => a.goal_id === g.id);
      const sumInr = linked.reduce((s, a) => s + (valById.get(a.holding_id) ?? 0) * (a.percentage / 100), 0);
      const rate = g.currency === 'INR' ? 1 : await fetchExchangeRate('INR', g.currency);
      return { ...g, current_amount: sumInr * rate };
    }));
    setGoals(withProgress);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  // Projection
  const years = Math.max(0, retireAge - currentAge);
  const r = RISK_RETURN[risk];
  const pmt = parseFloat(monthly) || 0;
  const fv = (withSavings: boolean) => {
    const rm = r / 12, n = years * 12;
    const growth = currentValue * Math.pow(1 + rm, n);
    const annuity = withSavings && rm > 0 ? pmt * ((Math.pow(1 + rm, n) - 1) / rm) : 0;
    return growth + annuity;
  };
  const projected = fv(true);
  const currentOnly = fv(false);

  const series = React.useMemo(() => {
    const proj: { value: number }[] = [];
    const cur: { value: number }[] = [];
    for (let y = 0; y <= years; y++) {
      const rm = r / 12, n = y * 12;
      proj.push({ value: currentValue * Math.pow(1 + rm, n) + (rm > 0 ? pmt * ((Math.pow(1 + rm, n) - 1) / rm) : 0) });
      cur.push({ value: currentValue * Math.pow(1 + rm, n) });
    }
    return { proj, cur };
  }, [years, r, pmt, currentValue]);

  const Stepper = ({ label, value, set, min, max, suffix }: { label: string; value: number; set: (n: number) => void; min: number; max: number; suffix: string }) => (
    <View>
      <Text style={styles.caps}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="minus" size={18} mode="contained-tonal" onPress={() => set(Math.max(min, value - 1))} />
        <Text style={{ color: theme.colors.onSurface, fontFamily: MONO, fontSize: 18 }}>{value} {suffix}</Text>
        <IconButton icon="plus" size={18} mode="contained-tonal" onPress={() => set(Math.min(max, value + 1))} />
      </View>
    </View>
  );

  const daysUntil = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
  const priorityColor = (p: string) => (p === 'high' ? theme.colors.error : p === 'medium' ? theme.colors.tertiary : theme.colors.onSurfaceVariant);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Forecast" />
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />}>
        {/* Parameters */}
        <View style={[styles.card, { backgroundColor: surfaces.low }]}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 12 }}>Parameters</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Stepper label="CURRENT AGE" value={currentAge} set={setCurrentAge} min={18} max={75} suffix="yrs" /></View>
            <View style={{ flex: 1 }}><Stepper label="RETIRE AT" value={retireAge} set={setRetireAge} min={currentAge + 1} max={85} suffix="yrs" /></View>
          </View>
          <Text style={[styles.caps, { marginTop: 12, marginBottom: 4 }]}>RISK APPETITE</Text>
          <SegmentedButtons value={risk} onValueChange={(v) => setRisk(v as Risk)} buttons={[
            { value: 'low', label: 'Low' }, { value: 'mod', label: 'Moderate' }, { value: 'high', label: 'High' },
          ]} />
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>Assumes ~{Math.round(r * 100)}% annual return</Text>
          <TextInput label="Monthly savings" value={monthly} onChangeText={setMonthly} mode="outlined" keyboardType="numeric" style={{ marginTop: 12 }} />
        </View>

        {/* Projected */}
        <View style={[styles.card, { backgroundColor: surfaces.low }]}>
          <Text style={styles.caps}>PROJECTED PORTFOLIO AT {retireAge}</Text>
          <Text style={{ color: theme.colors.onSurface, fontFamily: MONO, fontSize: 30, marginVertical: 6 }}>{fmt(projected)}</Text>
          <View style={[styles.pill, { backgroundColor: 'rgba(78,222,163,0.15)' }]}>
            <Ionicons name="trending-up" size={12} color={theme.colors.secondary} />
            <Text style={{ color: theme.colors.secondary, fontWeight: '700', fontSize: 12 }}>
              {currentOnly > 0 ? `+${Math.round(((projected - currentOnly) / currentOnly) * 100)}% from monthly savings` : 'Add savings to project growth'}
            </Text>
          </View>

          {years > 1 && currentValue > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
                <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: theme.colors.secondary }]} /><Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Projected</Text></View>
                <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: theme.colors.tertiary }]} /><Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Current trajectory</Text></View>
              </View>
              <LineChart
                dataSet={[
                  { data: series.proj, color: theme.colors.secondary },
                  { data: series.cur, color: theme.colors.tertiary, strokeDashArray: [4, 4] },
                ]}
                curved hideDataPoints thickness={2} hideRules
                yAxisThickness={0} xAxisThickness={0}
                hideYAxisText={hideValues}
                formatYLabel={(v: string) => compactNumber(Number(v))}
                noOfSections={3}
                yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 9 }}
                height={130} adjustToWidth initialSpacing={0} disableScroll
              />
            </View>
          )}
        </View>

        {/* Milestones (goals) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Milestones</Text>
          <Pressable onPress={() => router.push('/add-goal')}><Text style={{ color: theme.colors.secondary }}>+ Add goal</Text></Pressable>
        </View>
        {goals.length === 0 ? (
          <View style={[styles.card, { backgroundColor: surfaces.low }]}>
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              No goals yet. Add targets like retirement, a home, or an education fund — progress tracks your linked holdings automatically.
            </Text>
          </View>
        ) : goals.map((g) => {
          const progress = (g.current_amount || 0) / g.target_amount;
          return (
            <Pressable key={g.id} style={[styles.card, { backgroundColor: surfaces.low }]} onPress={() => router.push(`/add-goal?id=${g.id}`)}>
              <View style={styles.goalHeader}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>{g.name}</Text>
                <Chip compact textStyle={{ fontSize: 10, color: priorityColor(g.priority) }}>{g.priority}</Chip>
              </View>
              <View style={styles.goalAmounts}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{fmt(g.current_amount || 0, g.currency)} of {fmt(g.target_amount, g.currency)}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{daysUntil(g.target_date)}d left</Text>
              </View>
              <ProgressBar progress={Math.min(progress, 1)} color={progress >= 1 ? theme.colors.secondary : theme.colors.primary} style={{ height: 6, borderRadius: 3, marginTop: 8 }} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>{Math.round(progress * 100)}% complete</Text>
            </Pressable>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  card: { borderRadius: 12, padding: 16 },
  caps: { color: '#8F9098', fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: 'Inter_700Bold' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, alignSelf: 'flex-start' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  goalAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
});
