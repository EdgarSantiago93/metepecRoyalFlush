import { HandRow } from '@/components/poker-hands/hand-row';
import { POKER_HANDS } from '@/constants/poker-hands';
import { IconX } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Poker hands reference page — displayed as a modal.
 * Shows the 10 standard poker hands ranked highest to lowest,
 * with Spanish names and mini playing card examples.
 */
export default function PokerHandsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779';

  return (
    <View className="flex-1 bg-sand-50 dark:bg-sand-900">
      {/* Header */}
      <View
        className="flex-row items-center justify-between border-b border-sand-200 px-4 pb-3 dark:border-sand-700"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Text className="text-lg font-heading text-sand-950 dark:text-sand-50">
          Manos de Poker
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="items-center justify-center rounded-full p-1 active:bg-sand-200 dark:active:bg-sand-700"
        >
          <IconX size={22} color={iconColor} />
        </Pressable>
      </View>

      {/* Hands list */}
      <View className="flex-1 px-4 pt-3 pb-4">
        <Text className="mb-2 text-center text-[10px] text-sand-500 dark:text-sand-400">
          De mayor a menor valor
        </Text>
        {POKER_HANDS.map((hand, index) => (
          <HandRow key={hand.name} hand={hand} rank={index + 1} />
        ))}
      </View>
    </View>
  );
}
