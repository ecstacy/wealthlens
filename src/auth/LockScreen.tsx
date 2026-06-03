import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Vibration } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useAuthStore } from '../stores/authStore';

const PIN_LENGTH = 4;

export default function LockScreen() {
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { authenticateWithPin, authenticateWithBiometrics, biometricsEnabled } = useAuthStore();

  useEffect(() => {
    if (biometricsEnabled) {
      authenticateWithBiometrics();
    }
  }, [biometricsEnabled]);

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      handlePinSubmit();
    }
  }, [pin]);

  const handlePinSubmit = async () => {
    const success = await authenticateWithPin(pin);
    if (!success) {
      Vibration.vibrate(200);
      setError('Incorrect PIN');
      setPin('');
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < PIN_LENGTH) {
      setError('');
      setPin(pin + digit);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => (
    <View
      key={i}
      style={[
        styles.dot,
        {
          backgroundColor: i < pin.length ? theme.colors.primary : 'transparent',
          borderColor: error ? theme.colors.error : theme.colors.primary,
        },
      ]}
    />
  ));

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
        WealthLens
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 32 }}>
        Enter PIN to unlock
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

      {biometricsEnabled && (
        <Button mode="text" onPress={authenticateWithBiometrics} style={{ marginTop: 16 }}>
          Use Biometrics
        </Button>
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
});
