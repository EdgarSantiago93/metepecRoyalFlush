import { Text, View } from 'react-native';

export function NoSeasonSession() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-900">
      <Text className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        No Active Season
      </Text>
      <Text className="text-center text-base text-gray-500 dark:text-gray-400">
        A season must be created and active before sessions can be scheduled. Check the Season tab for details.
      </Text>
    </View>
  );
}
