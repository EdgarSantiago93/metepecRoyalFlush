import { Text, View } from 'react-native';

export function NoSession() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-900">
      <Text className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        No Session Scheduled
      </Text>
      <Text className="text-center text-base text-gray-500 dark:text-gray-400">
        Waiting for the treasurer to schedule the next game night.
      </Text>
    </View>
  );
}
