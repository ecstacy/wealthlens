import React from 'react';
import { Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabLayout() {
  const theme = useTheme();

  const screenOptions = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.onSurface,
    headerRight: () => (
      <Pressable onPress={() => router.push('/settings')} style={{ marginRight: 16 }}>
        <Ionicons name="settings-outline" size={22} color={theme.colors.onSurface} />
      </Pressable>
    ),
    tabBarStyle: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.outline,
      borderTopWidth: 0.5,
      height: 60,
      paddingBottom: 8,
    },
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
  };

  const tabIcon = (name: IconName, focused: boolean) => (
    <Ionicons name={name} size={22} color={focused ? theme.colors.primary : theme.colors.onSurfaceVariant} />
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          headerShown: false, // custom gradient hero handles the top area
          tabBarIcon: ({ focused }) => tabIcon('pie-chart', focused),
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: 'Income',
          tabBarIcon: ({ focused }) => tabIcon('trending-up', focused),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ focused }) => tabIcon('card', focused),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ focused }) => tabIcon('flag', focused),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused }) => tabIcon('bulb', focused),
        }}
      />
    </Tabs>
  );
}
