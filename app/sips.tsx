import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Text, useTheme, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabase } from '../src/db/database';
import { useMoney } from '../src/hooks/useMoney';
import { prettyLabel } from '../src/utils/labels';
import { surfaces } from '../src/theme';

interface Sip {
  id: number;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  next_date: string;
  is_active: number;
  holding_name: string;
}

export default function SipsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { fmt } = useMoney();
  const [sips, setSips] = useState<Sip[]>([]);

  const load = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Sip>(
      `SELECT sips.id, sips.amount, sips.currency, sips.frequency, sips.next_date, sips.is_active, holdings.name AS holding_name
       FROM sips JOIN holdings ON holdings.id = sips.holding_id ORDER BY sips.is_active DESC, sips.next_date`
    );
    setSips(rows);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const monthly = sips.filter((s) => s.is_active).reduce((sum, s) => sum + s.amount * (s.frequency === 'weekly' ? 52 / 12 : s.frequency === 'quarterly' ? 1 / 3 : 1), 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginBottom: 4 }}>SIPs</Text>
        {sips.some((s) => s.is_active) && (
          <Text variant="bodyMedium" style={{ color: theme.colors.secondary, marginBottom: 12 }}>≈ {fmt(monthly)}/month committed</Text>
        )}

        {sips.length === 0 ? (
          <View style={[styles.card, { backgroundColor: surfaces.low, alignItems: 'center', paddingVertical: 40 }]}>
            <Ionicons name="sync-circle-outline" size={40} color={theme.colors.secondary} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 12 }}>No SIPs yet</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>
              Track recurring investments into funds or stocks. Tap + to add one.
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: surfaces.low }]}>
            {sips.map((s, i) => (
              <View key={s.id}>
                <Pressable style={styles.row} onPress={() => router.push(`/add-sip?id=${s.id}`)}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge" style={{ color: s.is_active ? theme.colors.onSurface : theme.colors.onSurfaceVariant }} numberOfLines={1}>{s.holding_name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {prettyLabel(s.frequency)} · next {s.next_date}{s.is_active ? '' : ' · paused'}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{fmt(s.amount, s.currency as any)}</Text>
                </Pressable>
                {i < sips.length - 1 && <Divider style={{ backgroundColor: theme.colors.outline, opacity: 0.5 }} />}
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 90 }} />
      </ScrollView>

      <Pressable style={[styles.fab, { backgroundColor: theme.colors.secondary }]} onPress={() => router.push('/add-sip')}>
        <Ionicons name="add" size={28} color={theme.colors.onSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  card: { borderRadius: 12, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  fab: { position: 'absolute', right: 16, bottom: 24, width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
