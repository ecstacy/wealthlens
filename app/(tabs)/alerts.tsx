import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, useTheme, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getDatabase } from '../../src/db/database';
import { enrichHoldings } from '../../src/services/market';
import ScreenHeader from '../../src/components/ScreenHeader';
import { surfaces } from '../../src/theme';
import type { Holding } from '../../src/types';

interface Alert { icon: any; color: string; title: string; body: string; }

export default function AlertsScreen() {
  const theme = useTheme();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const db = await getDatabase();
    const out: Alert[] = [];

    // Upcoming SIPs (next 14 days)
    const sips = await db.getAllAsync<{ next_date: string; name: string }>(
      `SELECT sips.next_date, holdings.name AS name FROM sips JOIN holdings ON holdings.id = sips.holding_id WHERE sips.is_active = 1`
    );
    const soon = sips.filter((s) => { const d = new Date(s.next_date).getTime() - Date.now(); return d >= 0 && d <= 14 * 86400000; });
    soon.forEach((s) => out.push({ icon: 'calendar-outline', color: theme.colors.secondary, title: 'SIP due soon', body: `${s.name} on ${s.next_date}` }));

    // Allocation & concentration
    const rows = await db.getAllAsync<Holding>('SELECT * FROM holdings');
    const enriched = await enrichHoldings(rows, 'INR');
    const total = enriched.reduce((s, h) => s + h.current_value, 0);
    if (total > 0) {
      const equity = enriched.filter((h) => h.asset_class === 'equity').reduce((s, h) => s + h.current_value, 0);
      const equityPct = (equity / total) * 100;
      if (equityPct < 50) out.push({ icon: 'trending-up-outline', color: theme.colors.tertiary, title: 'Equity below target', body: `Equity is ${Math.round(equityPct)}%. Age 30-35 target is ~60-70%.` });
      if (equityPct > 80) out.push({ icon: 'warning-outline', color: '#FBBF24', title: 'High equity exposure', body: `Equity is ${Math.round(equityPct)}% — consider some debt/gold to balance risk.` });

      enriched.forEach((h) => {
        const pct = (h.current_value / total) * 100;
        if (pct > 15) out.push({ icon: 'alert-circle-outline', color: '#FBBF24', title: 'Concentration risk', body: `${h.name} is ${Math.round(pct)}% of your portfolio.` });
      });
    }

    setAlerts(out);
  }, [theme]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title="Alerts" />
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />}>
        {alerts.length === 0 ? (
          <View style={[styles.card, { backgroundColor: surfaces.low, alignItems: 'center', paddingVertical: 40 }]}>
            <Ionicons name="checkmark-circle-outline" size={40} color={theme.colors.secondary} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 12 }}>All clear</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>
              No SIP reminders, concentration, or allocation alerts right now.
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: surfaces.low }]}>
            {alerts.map((a, i) => (
              <View key={i}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: surfaces.high }]}><Ionicons name={a.icon} size={18} color={a.color} /></View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{a.title}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{a.body}</Text>
                  </View>
                </View>
                {i < alerts.length - 1 && <Divider style={{ backgroundColor: theme.colors.outline, opacity: 0.5 }} />}
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  card: { borderRadius: 12, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  iconWrap: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
