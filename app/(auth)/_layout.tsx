import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

export default function AuthLayout() {
  const auth = useAuth();

  if (auth.status === 'authenticated') {
    return <Redirect href="/(tabs)/index" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
