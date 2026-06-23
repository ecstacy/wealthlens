import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme, ActivityIndicator, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { analysePortfolio, analyseOverlaps, forecastReturns } from '../../src/services/analysis';
import { buildShareText } from '../../src/services/shareSummary';
import { enrichHoldings, type EnrichedHolding } from '../../src/services/market';
import { computeHealth, type Health } from '../../src/services/health';
import { getDatabase } from '../../src/db/database';
import { useMoney } from '../../src/hooks/useMoney';
import { prettyLabel } from '../../src/utils/labels';
import { chartColors, vibrantPalette, surfaces } from '../../src/theme';
import DonutChart from '../../src/components/DonutChart';
import ScreenHeader from '../../src/components/ScreenHeader';
import type { Holding, AssetClass } from '../../src/types';

type AnalysisType = 'portfolio' | 'overlaps' | 'forecast' | 'rebalance' | 'tax';

export default function InsightsScreen() {
  const theme = useTheme();
  const { fmt } = useMoney();
  const [loading, setLoading] = useState<AnalysisType | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [snack, setSnack] = useState('');
  const [holdings, setHoldings] = useState<EnrichedHolding[]>([]);
  const [health, setHealth] = useState<Health | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const db = await getDatabase();
        const rows = await db.getAllAsync<Holding>('SELECT * FROM holdings');
        const cached = await enrichHoldings(rows, 'INR', false, true);
        if (active) { setHoldings(cached); setHealth(computeHealth(cached)); }
        const live = await enrichHoldings(rows, 'INR', false, false);
        if (active) { setHoldings(live); setHealth(computeHealth(live)); }
      })();
      return () => { active = false; };
    }, [])
  );

  const total = holdings.reduce((s, h) => s + h.current_value, 0);
  const groupDonut = (keyFn: (h: EnrichedHolding) => string, colorFn: (k: string, i: number) => string) => {
    const by: Record<string, number> = {};
    holdings.forEach((h) => { const k = keyFn(h); by[k] = (by[k] || 0) + h.current_value; });
    return Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({
      value: v, color: colorFn(k, i), text: prettyLabel(k), label: `${prettyLabel(k)} ${total > 0 ? Math.round((v / total) * 100) : 0}%`,
    }));
  };
  const allocation = React.useMemo(() => groupDonut((h) => h.asset_class, (k) => chartColors[k as AssetClass] || '#999'), [holdings]);
  const countrySplit = React.useMemo(() => groupDonut((h) => h.country || h.geography, (_, i) => vibrantPalette[i % vibrantPalette.length]), [holdings]);
  const centerOf = (d: { value: number; text: string }[]) => {
    const tot = d.reduce((s, x) => s + x.value, 0); const top = [...d].sort((a, b) => b.value - a.value)[0];
    return { value: top && tot > 0 ? `${Math.round((top.value / tot) * 100)}%` : '', title: top?.text ?? '' };
  };
  const healthColor = !health ? theme.colors.onSurfaceVariant : health.score >= 80 ? '#4EDEA3' : health.score >= 65 ? '#B8C7E5' : health.score >= 50 ? '#FBBF24' : '#FFB4AB';

  const copyForClaude = async (anonymized: boolean) => {
    const text = await buildShareText(anonymized);
    await Clipboard.setStringAsync(text);
    setSnack(anonymized ? 'Anonymized summary copied (%, no names/amounts).' : 'Full summary copied — paste into a Claude chat.');
  };
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  // Re-check the saved API key every time this screen comes into focus,
  // so it reflects a key just entered on the settings screen.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      SecureStore.getItemAsync('wealthlens_claude_key').then((k) => {
        if (active) setHasKey(!!k && k.trim().length > 0);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const runAnalysis = async (type: AnalysisType) => {
    setLoading(type);
    let result: string;
    switch (type) {
      case 'portfolio':
      case 'rebalance':
      case 'tax':
        result = await analysePortfolio();
        break;
      case 'overlaps':
        result = await analyseOverlaps();
        break;
      case 'forecast':
        result = await forecastReturns();
        break;
    }
    setResults((prev) => ({ ...prev, [type]: result }));
    setLoading(null);
  };

  const insightCards: { key: AnalysisType; icon: React.ComponentProps<typeof Ionicons>['name']; title: string; description: string; action: string }[] = [
    {
      key: 'portfolio',
      icon: 'analytics',
      title: 'Portfolio Analysis',
      description: 'Get AI-powered analysis of your asset allocation, concentration risk, and diversification gaps.',
      action: 'Analyse Portfolio',
    },
    {
      key: 'overlaps',
      icon: 'git-compare',
      title: 'MF Overlap Detection',
      description: 'Find overlapping stocks across your mutual funds to avoid hidden concentration.',
      action: 'Check Overlaps',
    },
    {
      key: 'forecast',
      icon: 'trending-up',
      title: 'Return Forecast',
      description: 'Project your portfolio returns using CAGR and Monte Carlo simulation.',
      action: 'Forecast Returns',
    },
    {
      key: 'rebalance',
      icon: 'shuffle',
      title: 'Rebalancing Suggestions',
      description: 'Get recommendations to rebalance your portfolio based on your age and risk profile.',
      action: 'Get Suggestions',
    },
    {
      key: 'tax',
      icon: 'shield-checkmark',
      title: 'Tax Efficiency Review',
      description: 'Review your holdings for tax optimization opportunities (LTCG, STCG, indexation).',
      action: 'Review Taxes',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Analysis" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Health score */}
        {health && total > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Health Score</Text>
                <Text style={{ color: healthColor, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>{health.label.toUpperCase()}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
                <Text style={{ color: healthColor, fontFamily: 'Inter_700Bold', fontSize: 48 }}>{health.score}</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>/ 100</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: surfaces.high, marginTop: 8, overflow: 'hidden' }}>
                <View style={{ width: `${health.score}%`, height: 6, backgroundColor: healthColor }} />
              </View>
              {health.tips.slice(0, 3).map((t) => (
                <View key={t} style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Ionicons name="ellipse" size={6} color={theme.colors.onSurfaceVariant} style={{ marginTop: 7 }} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>{t}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Allocation donut */}
        {allocation.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Asset Allocation</Text>
                <Text style={{ color: theme.colors.onSurface, fontFamily: 'JetBrainsMono_500Medium', fontSize: 13 }}>{fmt(total)}</Text>
              </View>
              <View style={styles.chartRow}>
                <DonutChart data={allocation} centerValue={centerOf(allocation).value} centerTitle={centerOf(allocation).title} />
                <View style={styles.legendCol}>
                  {allocation.map((d) => (
                    <View key={d.text} style={styles.legendItem}>
                      <View style={[styles.dot, { backgroundColor: d.color }]} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{d.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Country donut */}
        {countrySplit.length > 1 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>Country Split</Text>
              <View style={styles.chartRow}>
                <DonutChart data={countrySplit} centerValue={centerOf(countrySplit).value} centerTitle={centerOf(countrySplit).title} />
                <View style={styles.legendCol}>
                  {countrySplit.map((d) => (
                    <View key={d.text} style={styles.legendItem}>
                      <View style={[styles.dot, { backgroundColor: d.color }]} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{d.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="bulb" size={32} color={theme.colors.primary} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 8 }}>
              AI-Powered Insights
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
              Your financial data stays on-device. Only anonymized portfolio structure is sent for analysis.
            </Text>

            {hasKey ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.secondary} />
                <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>API key configured</Text>
                <Button mode="text" compact onPress={() => router.push('/settings/api-keys')}>
                  Change
                </Button>
              </View>
            ) : (
              <Button mode="contained-tonal" onPress={() => router.push('/settings/api-keys')} style={{ marginTop: 8 }}>
                Configure API Key
              </Button>
            )}
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Ionicons name="copy-outline" size={24} color={theme.colors.secondary} />
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginLeft: 12, flex: 1 }}>Copy Summary for Claude</Text>
            </View>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Copy your portfolio to paste into a free Claude chat — no API key or cost.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button mode="contained-tonal" style={{ flex: 1 }} onPress={() => copyForClaude(false)}>Copy full</Button>
              <Button mode="outlined" style={{ flex: 1 }} onPress={() => copyForClaude(true)}>Copy anonymized</Button>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 10 }}>
              Note: pasting into claude.ai sends data to Anthropic (like the API). Consumer chats may be used to improve models unless you opt out in Settings → Privacy; the API never trains on your data. "Anonymized" shares only percentages — no names or amounts.
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={() => router.push('/tax-summary')}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Ionicons name="receipt-outline" size={24} color={theme.colors.tertiary} />
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginLeft: 12, flex: 1 }}>Year-End Tax Summary</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Estimated capital-gains tax (LTCG/STCG) if you sold today, computed on-device — no API key needed.
            </Text>
          </Card.Content>
        </Card>

        {insightCards.map((card) => (
          <Card key={card.key} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Ionicons name={card.icon} size={24} color={theme.colors.primary} />
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginLeft: 12 }}>{card.title}</Text>
              </View>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                {card.description}
              </Text>

              {results[card.key] && (
                <Card style={[styles.resultCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Card.Content>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>{results[card.key]}</Text>
                  </Card.Content>
                </Card>
              )}

              <Button
                mode="outlined"
                style={{ marginTop: 12, borderColor: theme.colors.primary }}
                textColor={theme.colors.primary}
                onPress={() => runAnalysis(card.key)}
                loading={loading === card.key}
                disabled={loading !== null}
              >
                {results[card.key] ? 'Re-run' : card.action}
              </Button>
            </Card.Content>
          </Card>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  card: { borderRadius: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  resultCard: { marginTop: 12, borderRadius: 8 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  legendCol: { flex: 1, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
