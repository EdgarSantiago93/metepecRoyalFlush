import type { PokerHand } from '@/constants/poker-hands';
import { Text, View } from 'react-native';
import { MiniCard } from './mini-card';

type Props = {
  hand: PokerHand;
  rank: number; // 1-based ranking (1 = highest)
};

/**
 * A single compact row in the poker hands reference:
 * ranking number, hand name, and 5 mini playing cards — all inline.
 */
export function HandRow({ hand, rank }: Props) {
  return (
    <View className="flex-row items-center py-1.5">
      <View className="h-5 w-5 items-center justify-center rounded-full bg-gold-500">
        <Text style={{ fontSize: 10, lineHeight: 13 }} className="font-sans-bold text-white">
          {rank}
        </Text>
      </View>
      <View className="ml-2 flex-1">
        <Text
          className="text-xs font-sans-semibold text-sand-950 dark:text-sand-50"
          numberOfLines={1}
        >
          {hand.name}
        </Text>
        <Text
          className="text-[9px] text-sand-400 dark:text-sand-500"
          numberOfLines={1}
        >
          {hand.desc}
        </Text>
      </View>
      <View className="flex-row">
        {hand.cards.map((card, i) => (
          <MiniCard key={`${card.rank}-${card.suit}-${i}`} card={card} />
        ))}
      </View>
    </View>
  );
}
