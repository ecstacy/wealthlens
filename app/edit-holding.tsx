import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText, ActivityIndicator } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { getDatabase } from '../src/db/database';
import AccountSelector from '../src/components/AccountSelector';
import CountryPicker from '../src/components/CountryPicker';
import { isAmountType } from '../src/data/holdingTypes';
import { findCountry, countryForGeography, type CountryOption } from '../src/data/countries';
import type { Account, Holding } from '../src/types';

export default function EditHoldingScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState<Holding | null>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [country, setCountry] = useState<CountryOption | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);

  const amountType = holding ? isAmountType(holding.asset_type) : false;

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      const h = await db.getFirstAsync<Holding>('SELECT * FROM holdings WHERE id = ?', Number(id));
      if (h) {
        setHolding(h);
        setName(h.name);
        if (isAmountType(h.asset_type)) setAmount(String(h.avg_price));
        else {
          setQuantity(String(h.quantity));
          setAvgPrice(String(h.avg_price));
        }
        setInterestRate(h.interest_rate != null ? String(h.interest_rate) : '');
        setCountry(findCountry(h.country) ?? countryForGeography(h.geography));
        const acct = await db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ?', h.account_id);
        setAccount(acct ?? null);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!holding || !country || !account) return;
    setSaving(true);
    const db = await getDatabase();

    const qty = amountType ? 1 : parseFloat(quantity || '0');
    const price = amountType ? parseFloat(amount || '0') : parseFloat(avgPrice || '0');

    await db.runAsync(
      `UPDATE holdings SET name = ?, account_id = ?, geography = ?, country = ?, currency = ?,
        quantity = ?, avg_price = ?, interest_rate = ?, updated_at = datetime('now')
       WHERE id = ?`,
      name.trim(), account.id, country.geography, country.label, country.currency,
      qty, price, interestRate ? parseFloat(interestRate) : null, holding.id
    );

    setSaving(false);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Delete holding', `Remove "${name}"? This also removes its SIPs and transactions.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const db = await getDatabase();
          await db.runAsync('DELETE FROM holdings WHERE id = ?', holding!.id);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!holding) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.onSurface }}>Holding not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginBottom: 4 }}>Edit Holding</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{holding.asset_type}{holding.symbol ? ` · ${holding.symbol}` : ''}</Text>

        <TextInput label="Name / Label" value={name} onChangeText={setName} mode="outlined" style={styles.input} />

        {amountType ? (
          <>
            <TextInput label="Current value / balance" value={amount} onChangeText={setAmount} mode="outlined" keyboardType="numeric" style={styles.input} />
            <TextInput label="Interest rate (% p.a.)" value={interestRate} onChangeText={setInterestRate} mode="outlined" keyboardType="numeric" style={styles.input} />
            <HelperText type="info" visible>Used for forecasts — not added to the value.</HelperText>
          </>
        ) : (
          <View style={styles.row}>
            <TextInput label="Quantity / Units" value={quantity} onChangeText={setQuantity} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1 }]} />
            <TextInput label="Avg buy price" value={avgPrice} onChangeText={setAvgPrice} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1 }]} />
          </View>
        )}

        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, marginBottom: 8 }}>Region</Text>
        <CountryPicker value={country} onChange={setCountry} />
        {country && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>Currency: {country.currency}</Text>
        )}

        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, marginBottom: 8 }}>Account</Text>
        <AccountSelector value={account} onChange={setAccount} />

        <View style={[styles.row, { marginTop: 24 }]}>
          <Button mode="outlined" onPress={() => router.back()} style={{ flex: 1 }}>Cancel</Button>
          <Button mode="contained" onPress={handleSave} loading={saving} disabled={!country || !account} style={{ flex: 1 }}>Save</Button>
        </View>

        <Button mode="text" textColor={theme.colors.error} onPress={handleDelete} style={{ marginTop: 12 }}>
          Delete holding
        </Button>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  input: { marginTop: 12 },
  row: { flexDirection: 'row', gap: 12 },
});
