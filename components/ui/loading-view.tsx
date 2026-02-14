import { ActivityIndicator, Text, View } from 'react-native';

type Props = {
  message?: string;
};

export function LoadingView({ message = 'Loading…' }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <ActivityIndicator size="large" className="mb-4" />
      <Text className="text-base text-gray-500 dark:text-gray-400">{message}</Text>
    </View>
  );
}
