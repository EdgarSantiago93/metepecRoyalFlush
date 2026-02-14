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
      className="flex-1 bg-sand-50 dark:bg-sand-900"
    >
      <View className="flex-1 items-center justify-center px-8">
        <Text className="mb-2 text-3xl font-bold text-sand-950 dark:text-sand-50">
          Metepec Royal Flush
        </Text>
        <Text className="mb-8 text-base text-sand-500 dark:text-sand-400">
          Sign in with your poker email
        </Text>

        <TextInput
          className="mb-4 w-full rounded-lg border border-sand-300 bg-sand-100 px-4 py-3 text-base text-sand-950 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-50"
          placeholder="you@poker.local"
          placeholderTextColor="#b5ac9e"
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
          className="w-full items-center rounded-lg bg-gold-500 px-4 py-3 active:bg-gold-600"
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
