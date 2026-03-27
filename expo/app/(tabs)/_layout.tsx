/**
 * Tab Layout for Rider App
 */

import { Tabs } from 'expo-router';
import { Package, IndianRupee, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { riderTheme } from '@/theme/riderTheme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: riderTheme.colors.background },
        tabBarActiveTintColor: riderTheme.colors.primary,
        tabBarInactiveTintColor: riderTheme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: riderTheme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: riderTheme.colors.border,
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
          paddingHorizontal: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => <IndianRupee size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
