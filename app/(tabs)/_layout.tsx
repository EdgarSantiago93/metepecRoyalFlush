import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const auth = useAuth();

  if (auth.status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Temporada',

            tabBarIcon: ({ color }) => <IconSymbol size={28} name="trophy.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="session"
          options={{
            title: 'Juego',

            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="play.circle.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ledger"
          options={{
            title: 'Registro',

            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="book.closed.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',

            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="person.crop.circle.fill" color={color} />
            ),
          }}
        />
      </Tabs>
  );
}
