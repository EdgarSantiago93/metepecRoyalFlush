import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await sendMagicLink(trimmed);
      router.push({ pathname: '/(auth)/verify', params: { email: trimmed } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-gray-900"
    >
      <View className="flex-1 items-center justify-center px-8">
        <Text className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Metepec Royal Flush
        </Text>
        <Text className="mb-8 text-base text-gray-500 dark:text-gray-400">
          Sign in with your poker email
        </Text>

        <TextInput
          className="mb-4 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="you@poker.local"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!loading}
          onSubmitEditing={handleSend}
          returnKeyType="go"
        />

        {error && (
          <Text className="mb-4 text-sm text-red-500">{error}</Text>
        )}

        <Pressable
          className="w-full items-center rounded-lg bg-blue-600 px-4 py-3 active:bg-blue-700"
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Send login link
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
