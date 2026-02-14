import "../global.css";

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { AuthProvider } from '@/contexts/auth-context';
import { AppStateProvider } from '@/contexts/app-state-context';

function AuthGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
        <ActivityIndicator size="large" />
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
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="deposit-upload" options={{ title: 'Upload Deposit' }} />
          <Stack.Screen name="deposit-approvals" options={{ title: 'Deposit Approvals' }} />
          <Stack.Screen name="host-order" options={{ title: 'Host Order' }} />
          <Stack.Screen name="season-settings" options={{ title: 'Season Settings' }} />
        </Stack>
        </AppStateProvider>
      </AuthGate>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
