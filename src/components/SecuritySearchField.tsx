import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, TextInput, SegmentedButtons, List, Chip, Divider, useTheme } from 'react-native-paper';
import { searchSecurities, searchMutualFunds, type SecurityResult } from '../services/search';

type Mode = 'security' | 'fund';

interface Props {
  /** Restrict to a single mode (e.g. only mutual funds for SIPs). Defaults to both. */
  modes?: Mode[];
  onSelect: (result: SecurityResult | null) => void;
}

/**
 * Search-as-you-type picker for stocks/ETFs/crypto (Yahoo) and Indian mutual
 * funds (mfapi.in). Calls onSelect with the chosen security, or null when cleared.
 */
export default function SecuritySearchField({ modes = ['security', 'fund'], onSelect }: Props) {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>(modes[0]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SecurityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SecurityResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    const minLen = mode === 'fund' ? 3 : 2;
    if (q.length < minLen) {
      setResults([]);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = mode === 'fund' ? await searchMutualFunds(q) : await searchSecurities(q);
      setResults(res);
      setSearching(false);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mode, selected]);

  const select = (r: SecurityResult) => {
    setSelected(r);
    setQuery(r.name);
    setResults([]);
    onSelect(r);
  };

  const clear = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
    onSelect(null);
  };

  return (
    <View>
      {modes.length > 1 && (
        <SegmentedButtons
          value={mode}
          onValueChange={(v) => {
            setMode(v as Mode);
            clear();
          }}
          buttons={[
            { value: 'security', label: 'Stock/ETF' },
            { value: 'fund', label: 'Mutual Fund' },
          ]}
        />
      )}

      <TextInput
        label={mode === 'fund' ? 'Search mutual funds' : 'Search stocks, ETFs, crypto'}
        value={query}
        onChangeText={(t) => {
          if (selected) {
            setSelected(null);
            onSelect(null);
          }
          setQuery(t);
        }}
        mode="outlined"
        style={styles.input}
        placeholder={mode === 'fund' ? 'e.g., Parag Parikh Flexi Cap' : 'e.g., Reliance, AAPL, BTC'}
        right={
          selected ? (
            <TextInput.Icon icon="close" onPress={clear} />
          ) : searching ? (
            <TextInput.Icon icon={() => <ActivityIndicator size={18} color={theme.colors.primary} />} />
          ) : (
            <TextInput.Icon icon="magnify" />
          )
        }
      />

      {!selected && results.length > 0 && (
        <View style={[styles.results, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          {results.map((r, i) => (
            <View key={`${r.symbol}-${i}`}>
              <List.Item
                title={r.name}
                titleNumberOfLines={2}
                description={`${r.symbol}  ·  ${r.exchange}  ·  ${r.currency}`}
                titleStyle={{ color: theme.colors.onSurface, fontSize: 14 }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
                onPress={() => select(r)}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={r.assetType === 'mutual_fund' ? 'chart-donut' : r.assetType === 'etf' ? 'chart-box' : 'chart-line'}
                    color={theme.colors.primary}
                  />
                )}
              />
              {i < results.length - 1 && <Divider style={{ backgroundColor: theme.colors.outline }} />}
            </View>
          ))}
        </View>
      )}

      {selected && (
        <View style={[styles.selectedCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface }} numberOfLines={2}>{selected.name}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <Chip compact textStyle={{ fontSize: 11 }}>{selected.symbol}</Chip>
            <Chip compact textStyle={{ fontSize: 11 }}>{selected.assetType}</Chip>
            <Chip compact textStyle={{ fontSize: 11 }}>{selected.currency}</Chip>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { marginTop: 12 },
  results: { marginTop: 8, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  selectedCard: { marginTop: 12, padding: 12, borderRadius: 12 },
});
