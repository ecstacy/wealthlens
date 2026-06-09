import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { PieChart } from 'react-native-gifted-charts';

export interface DonutSlice {
  value: number;
  color: string;
  text: string;
}

interface Props {
  data: DonutSlice[];
  centerTitle?: string;
  centerValue?: string;
  radius?: number;
}

/** Polished donut: gradient slices, press-to-focus, and a center label. */
export default function DonutChart({ data, centerTitle, centerValue, radius = 82 }: Props) {
  const theme = useTheme();

  const withGradient = data.map((d) => ({
    ...d,
    gradientCenterColor: d.color,
  }));

  return (
    <PieChart
      data={withGradient}
      donut
      showGradient
      sectionAutoFocus
      focusOnPress
      radius={radius}
      innerRadius={radius * 0.62}
      innerCircleColor={theme.colors.surface}
      strokeColor={theme.colors.surface}
      strokeWidth={3}
      centerLabelComponent={() => (
        <View style={{ alignItems: 'center' }}>
          {centerValue ? (
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>{centerValue}</Text>
          ) : null}
          {centerTitle ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{centerTitle}</Text>
          ) : null}
        </View>
      )}
    />
  );
}
