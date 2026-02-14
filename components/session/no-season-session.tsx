import { Text, View } from 'react-native';

export function NoSeasonSession() {
  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
      <Text className="mb-2 text-2xl font-bold text-sand-950 dark:text-sand-50">
        No Active Season
      </Text>
      <Text className="text-center text-base text-sand-500 dark:text-sand-400">
        A season must be created and active before sessions can be scheduled. Check the Season tab for details.
      </Text>
    </View>
  );
}
