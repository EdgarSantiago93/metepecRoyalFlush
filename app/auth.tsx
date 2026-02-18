import { Loader } from '@/components/ui/loader';
import { useAuth } from '@/hooks/use-auth';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

/**
 * Deep link handler for `metepecroyalflush://auth?token=...`
 * Receives the magic link token, verifies it, and redirects to tabs.
 */
export default function AuthDeepLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { verifyMagicLink } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (!token || verifyAttempted.current) return;
    verifyAttempted.current = true;

    (async () => {
      try {
        await verifyMagicLink(token);
        router.replace('/');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Verificación fallida');
      }
    })();
  }, [token, verifyMagicLink]);

  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-8 dark:bg-sand-900">
      {!error && (
        <View className="items-center">
          <Loader size={80} />
          <Text className="mt-4 text-sm text-sand-400">Verificando...</Text>
        </View>
      )}

      {error && (
        <View className="items-center">
          <Text className="mb-2 text-2xl font-heading text-sand-950 dark:text-sand-50">
            Error de verificación
          </Text>
          <Text className="mb-6 text-sm text-red-500">{error}</Text>
          <Pressable
            className="rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text className="font-semibold text-white">Ir al inicio</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
