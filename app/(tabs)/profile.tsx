import { Pressable, ScrollView, Text, View } from 'react-native';
import { DevStateToggle } from '@/components/profile/dev-state-toggle';
import { useAuth } from '@/hooks/use-auth';

export default function ProfileScreen() {
  const auth = useAuth();

  if (auth.status !== 'authenticated') {
    return null;
  }

  const { user, logout } = auth;

  return (
    <ScrollView className="flex-1 bg-sand-50 dark:bg-sand-900" contentContainerClassName="px-6 pt-16 pb-8">
      <View className="mb-8 items-center">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-felt-100 dark:bg-felt-900">
          <Text className="text-3xl font-bold text-felt-600 dark:text-felt-300">
            {user.displayName.charAt(0)}
          </Text>
        </View>
        <Text className="text-2xl font-bold text-sand-950 dark:text-sand-50">
          {user.displayName}
        </Text>
        <Text className="mt-1 text-base text-sand-500 dark:text-sand-400">
          {user.email}
        </Text>
        {user.isAdmin && (
          <View className="mt-2 rounded-full bg-gold-100 px-3 py-1 dark:bg-gold-900">
            <Text className="text-xs font-semibold text-gold-700 dark:text-gold-300">
              Admin
            </Text>
          </View>
        )}
      </View>

      <View className="border-t border-sand-200 pt-6 dark:border-sand-700">
        <Pressable
          className="items-center rounded-lg bg-red-50 px-4 py-3 active:bg-red-100 dark:bg-red-900/20 dark:active:bg-red-900/40"
          onPress={logout}
        >
          <Text className="text-base font-semibold text-red-600 dark:text-red-400">
            Sign out
          </Text>
        </Pressable>
      </View>

      {__DEV__ && <DevStateToggle />}
    </ScrollView>
  );
}
