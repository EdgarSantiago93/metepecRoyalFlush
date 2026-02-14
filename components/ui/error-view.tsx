import { Pressable, Text, View } from 'react-native';

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorView({ message, onRetry }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
      <Text className="mb-2 text-lg font-bold text-red-600 dark:text-red-400">
        Something went wrong
      </Text>
      <Text className="mb-6 text-center text-base text-sand-500 dark:text-sand-400">
        {message}
      </Text>
      {onRetry && (
        <Pressable
          className="rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
          onPress={onRetry}
        >
          <Text className="text-base font-semibold text-white">Retry</Text>
        </Pressable>
      )}
    </View>
  );
}
