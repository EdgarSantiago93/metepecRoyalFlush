import type { Card } from '@/constants/poker-hands';
import { SUIT_COLORS, SUIT_COLORS_DARK, SUIT_SYMBOLS } from '@/constants/poker-hands';
import { Text, useColorScheme, View } from 'react-native';

type Props = {
  card: Card;
};

/**
 * A small styled playing card that renders rank + suit symbol.
 * Uses red for hearts/diamonds and black (dark-mode: white) for spades/clubs.
 * No external image assets — pure styled components.
 */
export function MiniCard({ card }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const suitColor = isDark ? SUIT_COLORS_DARK[card.suit] : SUIT_COLORS[card.suit];
  const suitSymbol = SUIT_SYMBOLS[card.suit];

  return (
    <View
      className="items-center justify-center rounded border border-sand-200 bg-white dark:border-sand-600 dark:bg-sand-800"
      style={{ width: 28, height: 38, marginHorizontal: 1 }}
    >
      <Text
        style={{ color: suitColor, fontSize: 11, lineHeight: 14 }}
        className="font-sans-bold"
      >
        {card.rank}
      </Text>
      <Text style={{ color: suitColor, fontSize: 9, lineHeight: 11, marginTop: -1 }}>
        {suitSymbol}
      </Text>
    </View>
  );
}
