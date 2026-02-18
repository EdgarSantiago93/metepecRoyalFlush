import { Loader } from '@/components/ui/loader';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();

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

      <Pressable
        className="mt-8 rounded-lg border border-sand-200 px-6 py-3 dark:border-sand-700"
        onPress={() => router.back()}
      >
        <Text className="font-semibold text-sand-600 dark:text-sand-300">
          Intentar de nuevo
        </Text>
      </Pressable>
    </View>
  );
}
