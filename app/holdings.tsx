import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Text, Card, useTheme, Chip, Divider, FAB } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabase } from '../src/db/database';
import { enrichHoldings, type EnrichedHolding } from '../src/services/market';
import { useMoney } from '../src/hooks/useMoney';
import { prettyLabel } from '../src/utils/labels';
import type { Holding } from '../src/types';

const GAIN = '#22c55e';
const LOSS = '#ef4444';

export default function HoldingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { fmt } = useMoney();
  const [holdings, setHoldings] = useState<EnrichedHolding[]>([]);

  const load = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Holding>('SELECT * FROM holdings');
    // Instant from cache, then live.
    setHoldings(await enrichHoldings(rows, 'INR', false, true));
    setHoldings(await enrichHoldings(rows, 'INR', false, false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Group by asset class for readability.
  const groups = React.useMemo(() => {
    const by: Record<string, EnrichedHolding[]> = {};
    [...holdings].sort((a, b) => b.current_value - a.current_value).forEach((h) => {
      (by[h.asset_class] ||= []).push(h);
    });
    return Object.entries(by).sort((a, b) => b[1].reduce((s, h) => s + h.current_value, 0) - a[1].reduce((s, h) => s + h.current_value, 0));
  }, [holdings]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginBottom: 12 }}>All Holdings</Text>

        {holdings.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>No holdings yet. Tap + to add one.</Text>
        ) : (
          groups.map(([cls, items]) => (
            <Card key={cls} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text variant="titleSmall" style={{ color: theme.colors.primary, marginBottom: 4 }}>{prettyLabel(cls)}</Text>
                {items.map((h) => (
                  <Pressable key={h.id} onPress={() => router.push(`/edit-holding?id=${h.id}`)}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>{h.name}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          <Chip compact textStyle={{ fontSize: 10 }}>{prettyLabel(h.asset_type)}</Chip>
                          <Chip compact textStyle={{ fontSize: 10 }}>{prettyLabel(h.country || h.geography)}</Chip>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>{fmt(h.current_value)}</Text>
                        {h.is_live && (
                          <Text variant="bodySmall" style={{ color: h.gain_loss >= 0 ? GAIN : LOSS }}>
                            {h.gain_loss >= 0 ? '+' : ''}{h.gain_loss_pct.toFixed(1)}%
                          </Text>
                        )}
                      </View>
                    </View>
                    <Divider style={{ backgroundColor: theme.colors.outline, marginVertical: 8 }} />
                  </Pressable>
                ))}
              </Card.Content>
            </Card>
          ))
        )}
        <View style={{ height: 90 }} />
      </ScrollView>

      <FAB icon="plus" style={[styles.fab, { backgroundColor: theme.colors.primary }]} color={theme.colors.onPrimary} onPress={() => router.push('/add-holding')} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  card: { borderRadius: 16, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
