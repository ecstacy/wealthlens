import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, IconButton, Menu, useTheme } from 'react-native-paper';
import { useSettingsStore } from '../stores/settingsStore';
import type { Currency } from '../types';

/** Compact privacy (eye) + display-currency controls, shared across screens. */
export default function MoneyControls() {
  const theme = useTheme();
  const { hideValues, displayCurrency, setHideValues, setDisplayCurrency } = useSettingsStore();
  const [menu, setMenu] = useState(false);

  return (
    <View style={styles.row}>
      <Menu
        visible={menu}
        onDismiss={() => setMenu(false)}
        anchor={
          <Button
            compact
            mode="text"
            textColor={theme.colors.onSurfaceVariant}
            icon="chevron-down"
            contentStyle={{ flexDirection: 'row-reverse' }}
            onPress={() => setMenu(true)}
          >
            {displayCurrency}
          </Button>
        }
      >
        {(['INR', 'EUR', 'USD', 'GBP'] as Currency[]).map((c) => (
          <Menu.Item key={c} title={c} onPress={() => { setMenu(false); setDisplayCurrency(c); }} />
        ))}
      </Menu>
      <IconButton
        icon={hideValues ? 'eye-off' : 'eye'}
        size={20}
        iconColor={theme.colors.onSurfaceVariant}
        onPress={() => setHideValues(!hideValues)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
});
