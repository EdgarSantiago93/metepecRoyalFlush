import { ActivityIndicator, Text, View } from 'react-native';

type Props = {
  message?: string;
};

export function LoadingView({ message = 'Loading…' }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
      <ActivityIndicator size="large" className="mb-4" />
      <Text className="text-base text-sand-500 dark:text-sand-400">{message}</Text>
    </View>
  );
}
