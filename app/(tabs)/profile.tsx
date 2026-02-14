import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/hooks/use-auth';

export default function ProfileScreen() {
  const auth = useAuth();

  if (auth.status !== 'authenticated') {
    return null;
  }

  const { user, logout } = auth;

  return (
    <View className="flex-1 bg-white px-6 pt-16 dark:bg-gray-900">
      <View className="mb-8 items-center">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Text className="text-3xl font-bold text-blue-600 dark:text-blue-300">
            {user.displayName.charAt(0)}
          </Text>
        </View>
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          {user.displayName}
        </Text>
        <Text className="mt-1 text-base text-gray-500 dark:text-gray-400">
          {user.email}
        </Text>
        {user.isAdmin && (
          <View className="mt-2 rounded-full bg-amber-100 px-3 py-1 dark:bg-amber-900">
            <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Admin
            </Text>
          </View>
        )}
      </View>

      <View className="border-t border-gray-200 pt-6 dark:border-gray-700">
        <Pressable
          className="items-center rounded-lg bg-red-50 px-4 py-3 active:bg-red-100 dark:bg-red-900/20 dark:active:bg-red-900/40"
          onPress={logout}
        >
          <Text className="text-base font-semibold text-red-600 dark:text-red-400">
            Sign out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
