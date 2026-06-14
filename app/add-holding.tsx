import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, ProgressBar, List, Divider, HelperText, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { getDatabase } from '../src/db/database';
import SecuritySearchField from '../src/components/SecuritySearchField';
import AccountSelector from '../src/components/AccountSelector';
import CountryPicker from '../src/components/CountryPicker';
import { HOLDING_CATEGORIES, type HoldingCategory } from '../src/data/holdingTypes';
import { countryForGeography, COUNTRIES, type CountryOption } from '../src/data/countries';
import type { SecurityResult } from '../src/services/search';
import type { Account, AssetType, AssetClass } from '../src/types';

export default function AddHoldingScreen() {
  const theme = useTheme();
  const [step, setStep] = useState(0); // 0 type, 1 details, 2 region, 3 account, 4 review

  const [category, setCategory] = useState<HoldingCategory | null>(null);
  const [selected, setSelected] = useState<SecurityResult | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [blendClass, setBlendClass] = useState<AssetClass>('equity'); // for blended products (robo)
  const [country, setCountry] = useState<CountryOption | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);

  const totalSteps = 5;

  const pickCategory = (c: HoldingCategory) => {
    setCategory(c);
    // Default region: India for amount types; for search we set it on selection.
    if (c.flow === 'amount') setCountry(countryForGeography('india'));
    setStep(1);
  };

  const onSelectSecurity = (r: SecurityResult | null) => {
    setSelected(r);
    if (r) {
      setName(r.name);
      const c = COUNTRIES.find((x) => x.geography === r.geography && x.currency === r.currency)
        ?? countryForGeography(r.geography);
      setCountry(c);
    }
  };

  // ---- per-step validation ----
  const detailsValid = (() => {
    if (!category) return false;
    if (category.flow === 'search') {
      return !!selected && quantity !== '' && avgPrice !== '';
    }
    return name.trim() !== '' && amount !== '';
  })();

  const canNext =
    step === 0 ? !!category :
    step === 1 ? detailsValid :
    step === 2 ? !!country :
    step === 3 ? !!account :
    true;

  const handleSave = async () => {
    if (!category || !country || !account) return;
    setSaving(true);
    const db = await getDatabase();

    let assetType: AssetType = category.assetType;
    let assetClass: AssetClass = category.assetClass;
    let symbol: string | null = null;
    let qty: number;
    let price: number;

    if (category.flow === 'search' && selected) {
      assetType = selected.assetType;
      assetClass = selected.assetClass;
      symbol = selected.symbol;
      qty = parseFloat(quantity);
      price = parseFloat(avgPrice);
    } else {
      // amount type: value = amount, quantity = 1
      qty = 1;
      price = parseFloat(amount);
      if (category.chooseAssetClass) assetClass = blendClass;
    }

    await db.runAsync(
      `INSERT INTO holdings
       (account_id, name, asset_type, asset_class, geography, country, symbol, quantity, avg_price, currency, interest_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      account.id,
      name.trim(),
      assetType,
      assetClass,
      country.geography,
      country.label,
      symbol,
      qty,
      price,
      country.currency,
      interestRate ? parseFloat(interestRate) : null
    );

    setSaving(false);
    router.back();
  };

  const back = () => (step === 0 ? router.back() : setStep(step - 1));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>Add Holding</Text>
        <ProgressBar progress={(step + 1) / totalSteps} color={theme.colors.primary} style={{ marginTop: 12, borderRadius: 4 }} />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
          Step {step + 1} of {totalSteps}
        </Text>

        {/* STEP 0 — type */}
        {step === 0 && (
          <View style={{ marginTop: 16 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>What are you adding?</Text>
            <View style={[styles.list, { borderColor: theme.colors.outline }]}>
              {HOLDING_CATEGORIES.map((c, i) => (
                <View key={c.key}>
                  <List.Item
                    title={c.label}
                    titleStyle={{ color: theme.colors.onSurface }}
                    left={(p) => <List.Icon {...p} icon={c.icon} color={theme.colors.primary} />}
                    right={(p) => <List.Icon {...p} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
                    onPress={() => pickCategory(c)}
                  />
                  {i < HOLDING_CATEGORIES.length - 1 && <Divider style={{ backgroundColor: theme.colors.outline }} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* STEP 1 — details */}
        {step === 1 && category && (
          <View style={{ marginTop: 16 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{category.label} details</Text>

            {category.flow === 'search' ? (
              <>
                <SecuritySearchField modes={category.searchMode ? [category.searchMode] : ['security', 'fund']} onSelect={onSelectSecurity} />
                {selected && (
                  <View style={styles.row}>
                    <TextInput label="Quantity / Units" value={quantity} onChangeText={setQuantity} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1 }]} />
                    <TextInput label="Avg buy price" value={avgPrice} onChangeText={setAvgPrice} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1 }]} />
                  </View>
                )}
              </>
            ) : (
              <>
                <TextInput label="Name / Label" value={name} onChangeText={setName} mode="outlined" style={styles.input} placeholder={category.key === 'robo' ? 'e.g., Scripbox, Kuvera, Betterment' : 'e.g., HDFC Savings, SBI 1yr FD'} />
                <TextInput label="Current value / balance" value={amount} onChangeText={setAmount} mode="outlined" keyboardType="numeric" style={styles.input} placeholder="e.g., 250000" />
                {category.chooseAssetClass && (
                  <>
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 4 }}>Mandate / dominant asset class</Text>
                    <SegmentedButtons
                      value={blendClass}
                      onValueChange={(v) => setBlendClass(v as AssetClass)}
                      buttons={[{ value: 'equity', label: 'Equity' }, { value: 'debt', label: 'Debt' }, { value: 'gold', label: 'Gold' }]}
                    />
                  </>
                )}
                {category.hasInterest && (
                  <>
                    <TextInput label="Interest rate (% p.a.)" value={interestRate} onChangeText={setInterestRate} mode="outlined" keyboardType="numeric" style={styles.input} placeholder="e.g., 7.1" />
                    <HelperText type="info" visible>Used for forecasts and recommendations — not added to the value.</HelperText>
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* STEP 2 — region */}
        {step === 2 && (
          <View style={{ marginTop: 16 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>Region</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              The specific country improves diversification advice and sets the currency.
            </Text>
            <CountryPicker value={country} onChange={setCountry} />
            {country && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                Currency: {country.currency} · Region bucket: {country.geography}
              </Text>
            )}
          </View>
        )}

        {/* STEP 3 — account */}
        {step === 3 && (
          <View style={{ marginTop: 16 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>Where is it held?</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Pick a bank/platform you've used before, or add a new one.
            </Text>
            <AccountSelector value={account} onChange={setAccount} />
          </View>
        )}

        {/* STEP 4 — review */}
        {step === 4 && category && country && account && (
          <View style={{ marginTop: 16 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>Review</Text>
            {[
              ['Type', category.label],
              ['Name', name],
              category.flow === 'search'
                ? ['Holding', `${quantity} × ${avgPrice} ${country.currency}`]
                : ['Value', `${amount} ${country.currency}`],
              ...(interestRate ? [['Interest', `${interestRate}% p.a.`]] : []),
              ['Country', country.label],
              ['Account', account.name],
            ].map(([k, v]) => (
              <View key={k as string} style={styles.reviewRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>{k}</Text>
                <Text style={{ color: theme.colors.onSurface, flex: 1, textAlign: 'right' }} numberOfLines={2}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* nav buttons */}
        <View style={[styles.row, { marginTop: 28 }]}>
          <Button mode="outlined" onPress={back} style={{ flex: 1 }}>{step === 0 ? 'Cancel' : 'Back'}</Button>
          {step < totalSteps - 1 ? (
            <Button mode="contained" onPress={() => setStep(step + 1)} disabled={!canNext} style={{ flex: 1 }}>Next</Button>
          ) : (
            <Button mode="contained" onPress={handleSave} loading={saving} style={{ flex: 1 }}>Save</Button>
          )}
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
  list: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#444' },
});
