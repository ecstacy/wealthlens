import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button, useTheme, SegmentedButtons, Menu, List, Chip, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { getDatabase } from '../src/db/database';
import { searchSecurities, searchMutualFunds, type SecurityResult } from '../src/services/search';
import type { AssetType, AssetClass, Geography, Currency, Account } from '../src/types';

type Mode = 'security' | 'fund' | 'manual';

const MANUAL_TYPES: { value: AssetType; label: string; assetClass: AssetClass; geo: Geography }[] = [
  { value: 'fd', label: 'Fixed Deposit', assetClass: 'debt', geo: 'india' },
  { value: 'ppf', label: 'PPF', assetClass: 'debt', geo: 'india' },
  { value: 'nps', label: 'NPS', assetClass: 'equity', geo: 'india' },
  { value: 'sgb', label: 'Sovereign Gold Bond', assetClass: 'gold', geo: 'india' },
  { value: 'bond', label: 'Bond', assetClass: 'debt', geo: 'global' },
  { value: 'cash', label: 'Cash / Savings', assetClass: 'cash', geo: 'india' },
];

export default function AddHoldingScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('security');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SecurityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SecurityResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual state
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [manualType, setManualType] = useState(MANUAL_TYPES[0]);
  const [manualName, setManualName] = useState('');

  // Common fields
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [geography, setGeography] = useState<Geography>('india');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  // Debounced search whenever the query or mode changes
  useEffect(() => {
    if (mode === 'manual' || selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if ((mode === 'security' && q.length < 2) || (mode === 'fund' && q.length < 3)) {
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

  const loadAccounts = async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name');
    setAccounts(rows);
    if (rows.length > 0) setSelectedAccount(rows[0]);
  };

  const selectResult = (r: SecurityResult) => {
    setSelected(r);
    setCurrency(r.currency);
    setGeography(r.geography);
    setResults([]);
    setQuery(r.name);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setSelected(null);
    setQuery('');
    setResults([]);
    if (m === 'manual') {
      setGeography(manualType.geo);
      setCurrency(manualType.geo === 'india' ? 'INR' : 'USD');
    }
  };

  const handleSave = async () => {
    const db = await getDatabase();
    if (!selectedAccount) {
      await db.runAsync(
        'INSERT INTO accounts (name, type, currency) VALUES (?, ?, ?)',
        'My Portfolio', 'brokerage', 'INR'
      );
      await loadAccounts();
    }
    const acct = selectedAccount || (await db.getFirstAsync<Account>('SELECT * FROM accounts LIMIT 1'));
    if (!acct) return;

    setSaving(true);

    let name: string;
    let assetType: AssetType;
    let assetClass: AssetClass;
    let symbol: string | null;

    if (mode === 'manual') {
      name = manualName;
      assetType = manualType.value;
      assetClass = manualType.assetClass;
      symbol = null;
    } else {
      if (!selected) {
        setSaving(false);
        return;
      }
      name = selected.name;
      assetType = selected.assetType;
      assetClass = selected.assetClass;
      symbol = selected.symbol;
    }

    await db.runAsync(
      `INSERT INTO holdings (account_id, name, asset_type, asset_class, geography, symbol, quantity, avg_price, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      acct.id, name, assetType, assetClass, geography, symbol,
      parseFloat(quantity), parseFloat(avgPrice), currency
    );

    setSaving(false);
    router.back();
  };

  const canSave =
    quantity !== '' && avgPrice !== '' &&
    (mode === 'manual' ? manualName.trim() !== '' : selected !== null);

  const priceLabel = mode === 'fund' ? 'Avg NAV' : mode === 'manual' ? 'Value / Price' : 'Avg Buy Price';
  const qtyLabel = mode === 'fund' ? 'Units' : mode === 'manual' ? 'Quantity / Amount' : 'Quantity';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginBottom: 16 }}>
          Add Holding
        </Text>

        <SegmentedButtons
          value={mode}
          onValueChange={(v) => switchMode(v as Mode)}
          buttons={[
            { value: 'security', label: 'Stock/ETF' },
            { value: 'fund', label: 'Mutual Fund' },
            { value: 'manual', label: 'Other' },
          ]}
        />

        {/* SEARCH MODES */}
        {mode !== 'manual' && (
          <>
            <TextInput
              label={mode === 'fund' ? 'Search mutual funds' : 'Search stocks, ETFs, crypto'}
              value={query}
              onChangeText={(t) => {
                if (selected) setSelected(null);
                setQuery(t);
              }}
              mode="outlined"
              style={styles.input}
              placeholder={mode === 'fund' ? 'e.g., Parag Parikh Flexi Cap' : 'e.g., Reliance, AAPL, BTC'}
              right={
                selected ? (
                  <TextInput.Icon icon="close" onPress={clearSelection} />
                ) : searching ? (
                  <TextInput.Icon icon={() => <ActivityIndicator size={18} color={theme.colors.primary} />} />
                ) : (
                  <TextInput.Icon icon="magnify" />
                )
              }
            />

            {/* Results dropdown */}
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
                      onPress={() => selectResult(r)}
                      left={(props) => (
                        <List.Icon
                          {...props}
                          icon={
                            r.assetClass === 'crypto' ? 'bitcoin'
                            : r.assetType === 'etf' ? 'chart-box'
                            : r.assetType === 'mutual_fund' ? 'chart-donut'
                            : 'chart-line'
                          }
                          color={theme.colors.primary}
                        />
                      )}
                    />
                    {i < results.length - 1 && <Divider style={{ backgroundColor: theme.colors.outline }} />}
                  </View>
                ))}
              </View>
            )}

            {!selected && !searching && query.trim().length >= (mode === 'fund' ? 3 : 2) && results.length === 0 && (
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                No matches. Try a different name or ticker, or use "Other" for manual entry.
              </Text>
            )}

            {/* Selected confirmation */}
            {selected && (
              <View style={[styles.selectedCard, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface }} numberOfLines={2}>
                  {selected.name}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <Chip compact textStyle={{ fontSize: 11 }}>{selected.symbol}</Chip>
                  <Chip compact textStyle={{ fontSize: 11 }}>{selected.assetType}</Chip>
                  <Chip compact textStyle={{ fontSize: 11 }}>{selected.geography}</Chip>
                  <Chip compact textStyle={{ fontSize: 11 }}>{selected.currency}</Chip>
                </View>
              </View>
            )}
          </>
        )}

        {/* MANUAL MODE */}
        {mode === 'manual' && (
          <>
            <Menu
              visible={typeMenuVisible}
              onDismiss={() => setTypeMenuVisible(false)}
              anchor={
                <Button mode="outlined" onPress={() => setTypeMenuVisible(true)} style={styles.input}>
                  {manualType.label}
                </Button>
              }
            >
              {MANUAL_TYPES.map((t) => (
                <Menu.Item
                  key={t.value}
                  title={t.label}
                  onPress={() => {
                    setManualType(t);
                    setGeography(t.geo);
                    setCurrency(t.geo === 'india' ? 'INR' : 'USD');
                    setTypeMenuVisible(false);
                  }}
                />
              ))}
            </Menu>

            <TextInput
              label="Name"
              value={manualName}
              onChangeText={setManualName}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., HDFC Bank FD, PPF Account"
            />
          </>
        )}

        {/* COMMON FIELDS */}
        <View style={styles.row}>
          <TextInput
            label={qtyLabel}
            value={quantity}
            onChangeText={setQuantity}
            mode="outlined"
            style={[styles.input, { flex: 1 }]}
            keyboardType="numeric"
          />
          <TextInput
            label={priceLabel}
            value={avgPrice}
            onChangeText={setAvgPrice}
            mode="outlined"
            style={[styles.input, { flex: 1 }]}
            keyboardType="numeric"
          />
        </View>

        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>Currency</Text>
        <SegmentedButtons
          value={currency}
          onValueChange={(v) => setCurrency(v as Currency)}
          buttons={[
            { value: 'INR', label: 'INR' },
            { value: 'EUR', label: 'EUR' },
            { value: 'USD', label: 'USD' },
            { value: 'GBP', label: 'GBP' },
          ]}
          style={{ marginTop: 8 }}
        />

        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>Geography</Text>
        <SegmentedButtons
          value={geography}
          onValueChange={(v) => setGeography(v as Geography)}
          buttons={[
            { value: 'india', label: 'India' },
            { value: 'europe', label: 'Europe' },
            { value: 'us', label: 'US' },
            { value: 'global', label: 'Global' },
          ]}
          style={{ marginTop: 8 }}
        />

        <View style={[styles.row, { marginTop: 24 }]}>
          <Button mode="outlined" onPress={() => router.back()} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button mode="contained" onPress={handleSave} loading={saving} disabled={!canSave} style={{ flex: 1 }}>
            Save
          </Button>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  input: { marginTop: 12 },
  row: { flexDirection: 'row', gap: 12 },
  results: { marginTop: 8, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  selectedCard: { marginTop: 12, padding: 12, borderRadius: 12 },
});
