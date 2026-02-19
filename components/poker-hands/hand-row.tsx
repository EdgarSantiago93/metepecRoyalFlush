import type { PokerHand } from '@/constants/poker-hands';
import { Text, View } from 'react-native';
import { MiniCard } from './mini-card';

type Props = {
  hand: PokerHand;
  rank: number; // 1-based ranking (1 = highest)
};

/**
 * A single row in the poker hands reference:
 * ranking number, hand name (Spanish), and 5 mini playing cards.
 */
export function HandRow({ hand, rank }: Props) {
  return (
    <View className="mb-4 rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 dark:border-sand-700 dark:bg-sand-800/60">
      {/* Name row */}
      <View className="mb-2 flex-row items-center gap-2">
        <View className="h-6 w-6 items-center justify-center rounded-full bg-gold-500">
          <Text className="text-xs font-sans-bold text-white">{rank}</Text>
        </View>
        <Text className="text-sm font-sans-semibold text-sand-950 dark:text-sand-50">
          {hand.name}
        </Text>
      </View>

      {/* Cards row */}
      <View className="flex-row justify-center">
        {hand.cards.map((card, i) => (
          <MiniCard key={`${card.rank}-${card.suit}-${i}`} card={card} />
        ))}
      </View>
    </View>
  );
}
