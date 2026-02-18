import "../global.css";

import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Merriweather_400Regular,
  Merriweather_700Bold,
} from '@expo-google-fonts/merriweather';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loader } from "@/components/ui/loader";
import { AppStateProvider } from '@/contexts/app-state-context';
import { AuthProvider } from '@/contexts/auth-context';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
        <Loader size={80} />
      </View>
    );
  }

  return <>{children}</>;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigation() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate>
        <AppStateProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#fdfbf7' },
            headerTintColor: '#c49a3c',
            headerTitleStyle: { color: '#1a1714' },
            headerShadowVisible: false,
            headerBackTitle: 'Atrás',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="deposit-upload" options={{ title: 'Subir Depósito', presentation: 'modal' }} />
          <Stack.Screen name="deposit-approvals" options={{ title: 'Aprobar Depósitos' }} />
          <Stack.Screen name="host-order" options={{ title: 'Orden de Host' }} />
          <Stack.Screen name="season-settings" options={{ title: 'Opciones de Temporada' }} />
          <Stack.Screen name="schedule-session" options={{ title: 'Programar Juego' }} />
          <Stack.Screen name="ledger-session-detail" options={{ title: 'Detalle de Juego' }} />
          <Stack.Screen name="ledger-player-detail" options={{ title: 'Detalle de Jugador' }} />
          <Stack.Screen name="end-season" options={{ title: 'Finalizar Temporada' }} />
          <Stack.Screen name="payouts" options={{ title: 'Pagos' }} />
          <Stack.Screen name="chip-counter" options={{ title: 'Contador de Fichas' }} />
        </Stack>
        </AppStateProvider>
      </AuthGate>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CourierPrime_400Regular,
    CourierPrime_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Merriweather_400Regular,
    Merriweather_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
