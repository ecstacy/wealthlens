import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettingsStore } from '../stores/settingsStore';

interface Props {
  title: string;
  brand?: boolean; // show the shield logo style for Home
  showEye?: boolean;
  showSettings?: boolean;
}

export default function ScreenHeader({ title, brand, showEye, showSettings }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { hideValues, setHideValues } = useSettingsStore();

  return (
    <View style={[styles.row, { paddingTop: insets.top + 8 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        {brand && <Ionicons name="shield-checkmark" size={22} color={theme.colors.secondary} />}
        <Text variant={brand ? 'titleLarge' : 'headlineSmall'} style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {title}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {showEye && (
          <Pressable onPress={() => setHideValues(!hideValues)} hitSlop={10} style={{ padding: 6 }}>
            <Ionicons name={hideValues ? 'eye-off-outline' : 'eye-outline'} size={22} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        )}
        {showSettings && (
          <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={{ padding: 6 }}>
            <Ionicons name="person-circle-outline" size={26} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
});
