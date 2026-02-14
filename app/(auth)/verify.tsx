import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyMagicLink } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!email) return;

    const timer = setTimeout(async () => {
      setVerifying(true);
      try {
        await verifyMagicLink(email, 'mock-code');
        router.replace('/');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Verification failed');
      } finally {
        setVerifying(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [email, verifyMagicLink]);

  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-8 dark:bg-sand-900">
      <Text className="mb-2 text-2xl font-bold text-sand-950 dark:text-sand-50">
        Check your email
      </Text>
      <Text className="mb-8 text-center text-base text-sand-500 dark:text-sand-400">
        We sent a login link to{'\n'}
        <Text className="font-semibold text-sand-700 dark:text-sand-300">
          {email}
        </Text>
      </Text>

      {!error && (
        <View className="items-center">
          <ActivityIndicator size="large" className="mb-4" />
          <Text className="text-sm text-sand-400">
            {verifying ? 'Verifying...' : 'Waiting for verification...'}
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
            <Text className="font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
