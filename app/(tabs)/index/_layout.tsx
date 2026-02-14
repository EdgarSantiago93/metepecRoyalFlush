import { Stack } from 'expo-router';

export default function SeasonStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fdfbf7' }, // sand-50
        headerTintColor: '#c49a3c', // gold-500
        headerTitleStyle: { color: '#1a1714' }, // sand-950
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="deposit-upload" options={{ title: 'Upload Deposit' }} />
      <Stack.Screen name="deposit-approvals" options={{ title: 'Deposit Approvals' }} />
      <Stack.Screen name="host-order" options={{ title: 'Host Order' }} />
      <Stack.Screen name="season-settings" options={{ title: 'Season Settings' }} />
    </Stack>
  );
}
