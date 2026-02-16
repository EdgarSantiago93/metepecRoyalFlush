import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PulsingDot } from '@/components/ui/pulsing-dot';
import { Colors } from '@/constants/theme';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { View } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const auth = useAuth();
  const appState = useAppState();

  if (auth.status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

const hasLiveSession =
  appState.status === 'season_active' &&
  appState.session !== null &&
  ['dealing', 'in_progress', 'closing'].includes(appState.session.state);

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
              <GameComponent isActive={hasLiveSession} color={color} />
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


const GameComponent = ({isActive, color}: {isActive: boolean, color: string}) => {


if (isActive) {
  return (
    <View style={{position: 'relative'}}>
    <IconSymbol size={28} name="play.circle.fill" color={color} />
    <View style={{position: 'absolute', top: 0, right: -5}}>
    <PulsingDot color={'green'} />
    </View>
    </View>
  );
}
  return (
    <IconSymbol size={28} name="play.circle.fill" color={color} />
  );
};