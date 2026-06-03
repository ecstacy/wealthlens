import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme, Card, Switch } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../src/stores/authStore';

export default function SecurityScreen() {
  const theme = useTheme();
  const { biometricsAvailable, biometricsEnabled, checkSetup } = useAuthStore();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');

  const handleChangePin = async () => {
    const stored = await SecureStore.getItemAsync('wealthlens_pin');
    if (currentPin !== stored) {
      setMessage('Current PIN is incorrect');
      return;
    }
    if (newPin.length !== 4) {
      setMessage('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setMessage('New PINs do not match');
      return;
    }
    await SecureStore.setItemAsync('wealthlens_pin', newPin);
    setMessage('PIN changed successfully');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const toggleBiometrics = async (value: boolean) => {
    await SecureStore.setItemAsync('wealthlens_biometrics', String(value));
    checkSetup();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>Change PIN</Text>
          <TextInput label="Current PIN" value={currentPin} onChangeText={setCurrentPin} mode="outlined" secureTextEntry keyboardType="numeric" maxLength={4} style={styles.input} />
          <TextInput label="New PIN" value={newPin} onChangeText={setNewPin} mode="outlined" secureTextEntry keyboardType="numeric" maxLength={4} style={styles.input} />
          <TextInput label="Confirm New PIN" value={confirmPin} onChangeText={setConfirmPin} mode="outlined" secureTextEntry keyboardType="numeric" maxLength={4} style={styles.input} />
          {message ? <Text style={{ color: message.includes('success') ? theme.colors.secondary : theme.colors.error, marginTop: 8 }}>{message}</Text> : null}
          <Button mode="contained" onPress={handleChangePin} style={{ marginTop: 16 }}>Change PIN</Button>
        </Card.Content>
      </Card>

      {biometricsAvailable && (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Biometric Unlock</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Use Face ID or fingerprint</Text>
              </View>
              <Switch value={biometricsEnabled} onValueChange={toggleBiometrics} />
            </View>
          </Card.Content>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  card: { borderRadius: 12 },
  input: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
