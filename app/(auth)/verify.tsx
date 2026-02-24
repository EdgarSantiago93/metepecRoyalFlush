import { AppTextInput } from '@/components/ui/app-text-input';
import { ButtonActivityIndicator } from '@/components/ui/button-activity-indicator';
import { Loader } from '@/components/ui/loader';
import { useAuth } from '@/hooks/use-auth';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyMagicLink } = useAuth();

  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmitToken() {
    const trimmed = token.trim();
    if (!trimmed) return;

    setError(null);
    setVerifying(true);

    try {
      await verifyMagicLink(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Token inválido');
      setVerifying(false);
    }
  }

  const canSubmit = token.trim().length > 0 && !verifying;

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

      <View className="items-center">
        <Loader size={80} />
        <Text className="text-sm text-sand-400">Esperando verificación...</Text>
      </View>

      {/* Divider */}
      <View className="my-6 w-full flex-row items-center">
        <View className="flex-1 border-b border-sand-200 dark:border-sand-700" />
        <Text className="mx-3 text-sm text-sand-400">
          O pega el token del correo aquí
        </Text>
        <View className="flex-1 border-b border-sand-200 dark:border-sand-700" />
      </View>

      {/* Manual token input */}
      <AppTextInput
        size="sm"
        className="mb-4 w-full"
        placeholder="Pegar token"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!verifying}
        onSubmitEditing={handleSubmitToken}
        returnKeyType="go"
      />

      {error && (
        <Text className="mb-4 text-center text-sm text-red-500">{error}</Text>
      )}

      <Pressable
        className={`mb-4 w-full items-center rounded-lg px-4 py-3.5 ${
          canSubmit
            ? 'bg-gold-500 active:bg-gold-600'
            : 'bg-sand-300 dark:bg-sand-700'
        }`}
        onPress={handleSubmitToken}
        disabled={!canSubmit}
      >
        {verifying ? (
          <ButtonActivityIndicator />
        ) : (
          <Text className="font-sans-semibold text-base text-white">
            Verificar
          </Text>
        )}
      </Pressable>

      <Pressable
        className="rounded-lg border border-sand-200 px-6 py-3 dark:border-sand-700"
        onPress={() => router.back()}
      >
        <Text className="font-semibold text-sand-600 dark:text-sand-300">
          Intentar de nuevo
        </Text>
      </Pressable>
    </View>
  );
}
