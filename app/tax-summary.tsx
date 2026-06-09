import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, useTheme, Divider, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { estimateTax, type TaxEstimate } from '../src/services/tax';
import { useMoney } from '../src/hooks/useMoney';

export default function TaxSummaryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { fmt } = useMoney();
  const [est, setEst] = useState<TaxEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    estimateTax().then((e) => { if (active) { setEst(e); setLoading(false); } });
    return () => { active = false; };
  }, []));

  const Row = ({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) => (
    <View style={styles.row}>
      <Text style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>{label}</Text>
      <Text style={{ color: color ?? theme.colors.onSurface, fontWeight: bold ? '800' : '500' }}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}>
      <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginBottom: 4 }}>Year-End Tax Summary</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
        Estimated tax if you sold everything today (India rules). Holding periods are approximated from when each holding was added.
      </Text>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : !est ? null : (
        <>
          <Card style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Estimated tax owed</Text>
              <Text variant="displaySmall" style={{ color: theme.colors.tertiary, fontWeight: '800' }}>{fmt(est.totalTax)}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                on {fmt(est.totalGain)} of unrealized gains
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>Equity</Text>
              <Row label="LTCG gain (held >1yr)" value={fmt(est.equityLtcgGain)} />
              <Row label="— exemption applied" value={`− ${fmt(Math.min(est.equityLtcgGain, 125000))}`} color={theme.colors.secondary} />
              <Row label="LTCG taxable @ 12.5%" value={fmt(est.ltcgTaxable)} />
              <Row label="LTCG tax" value={fmt(est.equityLtcgTax)} bold />
              <Divider style={{ backgroundColor: theme.colors.outline, marginVertical: 8 }} />
              <Row label="STCG gain (held <1yr)" value={fmt(est.equityStcgGain)} />
              <Row label="STCG tax @ 20%" value={fmt(est.equityStcgTax)} bold />
            </Card.Content>
          </Card>

          {est.cryptoGain > 0 && (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>Crypto (VDA)</Text>
                <Row label="Gain" value={fmt(est.cryptoGain)} />
                <Row label="Tax @ 30% (flat)" value={fmt(est.cryptoTax)} bold />
              </Card.Content>
            </Card>
          )}

          {(est.otherGain > 0 || est.lossTotal < 0) && (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>Notes</Text>
                {est.otherGain > 0 && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
                    Debt/gold gains of {fmt(est.otherGain)} are taxed at your income-slab rate (not estimated here).
                  </Text>
                )}
                {est.lossTotal < 0 && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    You have {fmt(Math.abs(est.lossTotal))} of unrealized losses that could offset gains if realized (tax-loss harvesting).
                  </Text>
                )}
              </Card.Content>
            </Card>
          )}

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Estimate only — based on current prices and approximate holding periods. Actual tax depends on realized transactions, exact buy dates, and your full income. Consult a tax advisor.
          </Text>
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  card: { borderRadius: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 12 },
});
