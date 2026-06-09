import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Menu } from 'react-native-paper';
import { COUNTRIES, type CountryOption } from '../data/countries';

interface Props {
  value: CountryOption | null;
  onChange: (c: CountryOption) => void;
  label?: string;
}

export default function CountryPicker({ value, onChange, label = 'Select country / region' }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <Button mode="outlined" icon="earth" onPress={() => setVisible(true)}>
          {value ? value.label : label}
        </Button>
      }
    >
      <ScrollView style={{ maxHeight: 360 }}>
        {COUNTRIES.map((c) => (
          <Menu.Item
            key={c.code}
            title={`${c.label}  (${c.currency})`}
            onPress={() => {
              onChange(c);
              setVisible(false);
            }}
          />
        ))}
      </ScrollView>
    </Menu>
  );
}
