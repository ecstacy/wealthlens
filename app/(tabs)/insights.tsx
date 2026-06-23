import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme, ActivityIndicator, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { analysePortfolio, analyseOverlaps, forecastReturns } from '../../src/services/analysis';
import { buildShareText } from '../../src/services/shareSummary';
import ScreenHeader from '../../src/components/ScreenHeader';

type AnalysisType = 'portfolio' | 'overlaps' | 'forecast' | 'rebalance' | 'tax';

export default function InsightsScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState<AnalysisType | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [snack, setSnack] = useState('');

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
});
