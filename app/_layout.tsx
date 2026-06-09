import React, { useEffect } from 'react';
import { Slot } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { darkTheme } from '../src/theme';
import { useAuthStore } from '../src/stores/authStore';
import LockScreen from '../src/auth/LockScreen';
import SetupScreen from '../src/auth/SetupScreen';

export default function RootLayout() {
  const { isAuthenticated, isSetup, loading, checkSetup } = useAuthStore();

  useEffect(() => {
    checkSetup();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={darkTheme}>
        <StatusBar style="light" />
        {loading ? (
          <View style={[styles.loading, { backgroundColor: darkTheme.colors.background }]}>
            <ActivityIndicator size="large" color={darkTheme.colors.primary} />
          </View>
        ) : !isSetup ? (
          <SetupScreen />
        ) : !isAuthenticated ? (
          <LockScreen />
        ) : (
          <Slot />
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
