import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { analysePortfolio, analyseOverlaps, forecastReturns } from '../../src/services/analysis';

type AnalysisType = 'portfolio' | 'overlaps' | 'forecast' | 'rebalance' | 'tax';

export default function InsightsScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState<AnalysisType | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
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
