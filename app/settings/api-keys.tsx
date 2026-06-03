import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSettingsStore } from '../../src/stores/settingsStore';

export default function ApiKeysScreen() {
  const theme = useTheme();
  const { claudeApiKey, setClaudeApiKey, loadSettings } = useSettingsStore();
  const [key, setKey] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (claudeApiKey) setKey(claudeApiKey);
  }, [claudeApiKey]);

  // A key is "active" if it's stored AND the field still matches what's stored.
  const isActive = !!claudeApiKey && key.trim() === claudeApiKey;
  const hasUnsavedChanges = key.trim().length > 0 && key.trim() !== (claudeApiKey ?? '');

  const handleSave = async () => {
    await setClaudeApiKey(key.trim());
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>Claude API Key</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            Your API key is stored securely in the device keychain. It is only used to send anonymized portfolio structure for analysis.
          </Text>

          {/* Persistent saved-state indicator */}
          {isActive && (
            <View style={[styles.statusBar, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.secondary} />
              <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                Key saved and active
              </Text>
            </View>
          )}

          <TextInput
            label="API Key"
            value={key}
            onChangeText={setKey}
            mode="outlined"
            secureTextEntry
            placeholder="sk-ant-..."
            autoCapitalize="none"
            autoCorrect={false}
          />

          {hasUnsavedChanges && (
            <Text variant="bodySmall" style={{ color: theme.colors.tertiary, marginTop: 8 }}>
              You have unsaved changes — tap Save to store the key.
            </Text>
          )}

          <View style={styles.actions}>
            <Button mode="outlined" onPress={() => router.back()}>
              {isActive ? 'Done' : 'Cancel'}
            </Button>
            <Button mode="contained" onPress={handleSave} disabled={!key.trim() || isActive}>
              {justSaved ? 'Saved ✓' : isActive ? 'Saved' : 'Save'}
            </Button>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginBottom: 12 },
});
