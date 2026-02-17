import { Loader } from '@/components/ui/loader';
import { useAuth } from '@/hooks/use-auth';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function VerifyScreen() {
  const { email, code } = useLocalSearchParams<{ email: string; code?: string }>();
  const { verifyMagicLink } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (!email || !code || verifyAttempted.current) return;
    verifyAttempted.current = true;

    (async () => {
      setVerifying(true);
      try {
        await verifyMagicLink(email, code);
        router.replace('/');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Verificación fallida');
      } finally {
        setVerifying(false);
      }
    })();
  }, [email, code, verifyMagicLink]);

  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-8 dark:bg-sand-900">
      <Text className="mb-2 text-2xl font-heading text-sand-950 dark:text-sand-50">
        Revisa tu correo
      </Text>
      <Text className="mb-8 text-center text-base text-sand-500 dark:text-sand-400">
        Enviamos un enlace de acceso a{'\n'}
        <Text className="font-semibold text-sand-700 dark:text-sand-300">
          {email}
        </Text>
      </Text>

      {!error && (
        <View className="items-center">
          <Loader size={80} />
          <Text className="text-sm text-sand-400">
            {verifying ? 'Verificando...' : 'Esperando verificación...'}
          </Text>
        </View>
      )}

      {error && (
        <View className="items-center">
          <Text className="mb-4 text-sm text-red-500">{error}</Text>
          <Pressable
            className="rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
            onPress={() => router.back()}
          >
            <Text className="font-semibold text-white">Intentar de nuevo</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
