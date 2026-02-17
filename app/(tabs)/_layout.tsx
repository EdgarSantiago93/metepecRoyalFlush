import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { PulsingDot } from '@/components/ui/pulsing-dot';
import { Colors } from '@/constants/theme';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconBook, IconCards, IconTrophy, IconUser } from '@tabler/icons-react-native';
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

            tabBarIcon: ({ color }) => <IconTrophy size={28} color={color} />,
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
              <IconBook size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color }) => (
              <IconUser size={28} color={color} />
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
    <IconCards size={28} color={color} />
    <View style={{position: 'absolute', top: 0, right: -5}}>
    <PulsingDot color={'green'} />
    </View>
    </View>
  );
}
  return (
    <IconCards size={28} color={color} />
  );
};