import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabLayout() {
  const theme = useTheme();

  const tabIcon = (name: IconName, focused: boolean) => (
    <Ionicons name={name} size={22} color={focused ? theme.colors.secondary : theme.colors.onSurfaceVariant} />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#171F33',
          borderTopColor: theme.colors.outline,
          borderTopWidth: 0.5,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
      }}
    >
      <Tabs.Screen name="portfolio" options={{ title: 'Home', tabBarIcon: ({ focused }) => tabIcon('grid-outline', focused) }} />
      <Tabs.Screen name="insights" options={{ title: 'Analysis', tabBarIcon: ({ focused }) => tabIcon('pie-chart-outline', focused) }} />
      <Tabs.Screen name="news" options={{ title: 'News', tabBarIcon: ({ focused }) => tabIcon('newspaper-outline', focused) }} />
      <Tabs.Screen name="goals" options={{ title: 'Forecast', tabBarIcon: ({ focused }) => tabIcon('trending-up-outline', focused) }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: ({ focused }) => tabIcon('notifications-outline', focused) }} />

      {/* Reachable from Home, hidden from the tab bar */}
      <Tabs.Screen name="income" options={{ href: null }} />
      <Tabs.Screen name="expenses" options={{ href: null }} />
    </Tabs>
  );
}
