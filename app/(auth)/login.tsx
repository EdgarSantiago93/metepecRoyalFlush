import { AppTextInput } from '@/components/ui/app-text-input';
import { ChipRain } from '@/components/ui/chip-rain';
import { Loader } from '@/components/ui/loader';
import { useAuth } from '@/hooks/use-auth';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOGO_SMALL = 160;
const LOGO_LARGE = 280;
const TIMING = { duration: 500, easing: Easing.bezier(0.4, 0, 0.2, 1) };

export default function LoginScreen() {
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { bottom } = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      setLoading(false);
      setError(null);
      progress.value = withTiming(0, TIMING);
    }, [progress]),
  );

  const logoStyle = useAnimatedStyle(() => {
    const size = interpolate(progress.value, [0, 1], [LOGO_SMALL, LOGO_LARGE]);
    return { width: size, height: size };
  });

  const formStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4], [1, 0]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, 60]) }],
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.3, 0.7], [0, 1]),
  }));

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Por favor ingresa tu correo');
      return;
    }

    setError(null);
    setLoading(true);
    progress.value = withTiming(1, TIMING);

    try {
      await sendMagicLink(trimmed);
      router.push({ pathname: '/(auth)/verify', params: { email: trimmed } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal');
      setLoading(false);
      progress.value = withTiming(0, TIMING);
    }
  }
  
  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
      className="flex-1 bg-felt-600 dark:bg-felt-800"
    >
      {/* Green table — logo centered */}
      <View className="flex-1 items-center justify-center">
        <ChipRain />
        <Animated.View style={logoStyle}>
          <Image
            source={require('@/assets/images/mrf_1_sm.png')}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
          />
        </Animated.View>

        {/* Spinner — fades in as form fades out */}
        <Animated.View style={[spinnerStyle, { marginTop: 24, height: 36 }]}>
          {loading && <Loader size={80} />}
      
        </Animated.View>
       
      </View>

      {/* Form card — slides down on submit */}
      <Animated.View
        style={formStyle}
        pointerEvents={loading ? 'none' : 'auto'}
      >
        <View className="rounded-3xl bg-sand-50 px-8 pt-8 dark:bg-sand-900" style={{ paddingBottom: Math.max(bottom, 16) + 32 }}>
          <Text className="mb-6 text-center font-heading text-2xl text-sand-500 dark:text-sand-400">
          A darle
          </Text>

          <AppTextInput
            testID="login-email-input"
            className="mb-4 w-full text-[14px]"
            placeholder="tu@poker.local"
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
            <Text className="mb-4 text-center text-sm text-red-500">{error}</Text>
          )}

          <Pressable
            testID="login-send-button"
            className="w-full items-center rounded-lg bg-gold-500 px-4 py-3.5 active:bg-gold-600"
            onPress={handleSend}
            disabled={loading}
          >
            <Text className="font-sans-semibold text-base text-white">
              Entrar
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
