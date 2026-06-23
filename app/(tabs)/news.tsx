import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable, Linking } from 'react-native';
import { Text, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getDatabase } from '../../src/db/database';
import { fetchNews, type NewsItem } from '../../src/services/news';
import ScreenHeader from '../../src/components/ScreenHeader';
import { surfaces } from '../../src/theme';

export default function NewsScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ symbol: string }>("SELECT symbol FROM holdings WHERE symbol IS NOT NULL AND asset_type != 'mutual_fund'");
    const symbols = rows.map((r) => r.symbol).filter(Boolean);
    setItems(await fetchNews(symbols));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const ago = (t: number) => {
    if (!t) return '';
    const h = Math.round((Date.now() - t * 1000) / 3600000);
    return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title="Market News" />
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />}>
        {loading ? (
          <ActivityIndicator color={theme.colors.secondary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 24, textAlign: 'center' }}>
            No news right now. Add some stocks/ETFs and pull to refresh.
          </Text>
        ) : (
          <View style={[styles.card, { backgroundColor: surfaces.low }]}>
            {items.map((n, i) => (
              <View key={n.title}>
                <Pressable style={styles.row} onPress={() => n.link && Linking.openURL(n.link)}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={3}>{n.title}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>{n.publisher}{n.time ? ` · ${ago(n.time)}` : ''}</Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color={theme.colors.onSurfaceVariant} />
                </Pressable>
                {i < items.length - 1 && <Divider style={{ backgroundColor: theme.colors.outline, opacity: 0.5 }} />}
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
});
