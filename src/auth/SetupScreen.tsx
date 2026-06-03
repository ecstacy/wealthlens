import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Switch, useTheme } from 'react-native-paper';
import { useAuthStore } from '../stores/authStore';

const PIN_LENGTH = 4;

export default function SetupScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enableBio, setEnableBio] = useState(true);
  const [error, setError] = useState('');
  const { setupPin, biometricsAvailable } = useAuthStore();

  const currentPin = step === 'create' ? pin : confirmPin;
  const setCurrentPin = step === 'create' ? setPin : setConfirmPin;

  const handleDigit = (digit: string) => {
    if (currentPin.length < PIN_LENGTH) {
      setError('');
      const next = currentPin + digit;
      setCurrentPin(next);

      if (next.length === PIN_LENGTH) {
        if (step === 'create') {
          setStep('confirm');
        } else {
          if (next === pin) {
            setupPin(pin, enableBio && biometricsAvailable);
          } else {
            setError('PINs do not match');
            setConfirmPin('');
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setCurrentPin(currentPin.slice(0, -1));
    setError('');
  };

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => (
    <View
      key={i}
      style={[
        styles.dot,
        {
          backgroundColor: i < currentPin.length ? theme.colors.primary : 'transparent',
          borderColor: error ? theme.colors.error : theme.colors.primary,
        },
      ]}
    />
  ));

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
        Welcome to WealthLens
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
        {step === 'create' ? 'Create a 4-digit PIN' : 'Confirm your PIN'}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 32 }}>
        Your data stays encrypted on this device
      </Text>

      <View style={styles.dotsContainer}>{dots}</View>
      {error ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}

      <View style={styles.keypad}>
        {digits.map((d, i) => {
          if (d === '') return <View key={i} style={styles.key} />;
          if (d === 'del') {
            return (
              <Button key={i} mode="text" onPress={handleDelete} style={styles.key} labelStyle={styles.keyLabel}>
                {'<'}
              </Button>
            );
          }
          return (
            <Button
              key={i}
              mode="text"
              onPress={() => handleDigit(d)}
              style={styles.key}
              labelStyle={[styles.keyLabel, { color: theme.colors.onBackground }]}
            >
              {d}
            </Button>
          );
        })}
      </View>

      {biometricsAvailable && step === 'create' && (
        <View style={styles.bioRow}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Enable biometric unlock
          </Text>
          <Switch value={enableBio} onValueChange={setEnableBio} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontWeight: '700', marginBottom: 8 },
  dotsContainer: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  error: { marginBottom: 8, fontSize: 14 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 270, justifyContent: 'center' },
  key: { width: 80, height: 64, justifyContent: 'center', margin: 4 },
  keyLabel: { fontSize: 24 },
  bioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
});
