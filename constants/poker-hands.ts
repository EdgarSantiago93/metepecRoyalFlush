/**
 * Standard 10 poker hand rankings in Spanish, highest to lowest.
 * Each hand includes a representative 5-card example.
 *
 * Card shape: { rank, suit }
 *   rank — display string: 'A', 'K', 'Q', 'J', '10', '9', etc.
 *   suit — one of 'spades' | 'hearts' | 'diamonds' | 'clubs'
 */

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Card = {
  rank: string;
  suit: Suit;
};

export type PokerHand = {
  name: string;
  cards: Card[];
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
};

export const SUIT_COLORS: Record<Suit, string> = {
  spades: '#1a1714',
  hearts: '#dc2626',
  diamonds: '#dc2626',
  clubs: '#1a1714',
};

export const SUIT_COLORS_DARK: Record<Suit, string> = {
  spades: '#fdfbf7',
  hearts: '#ef4444',
  diamonds: '#ef4444',
  clubs: '#fdfbf7',
};

export const POKER_HANDS: PokerHand[] = [
  {
    name: 'Escalera Real',
    cards: [
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'spades' },
      { rank: 'Q', suit: 'spades' },
      { rank: 'J', suit: 'spades' },
      { rank: '10', suit: 'spades' },
    ],
  },
  {
    name: 'Escalera de Color',
    cards: [
      { rank: '9', suit: 'hearts' },
      { rank: '8', suit: 'hearts' },
      { rank: '7', suit: 'hearts' },
      { rank: '6', suit: 'hearts' },
      { rank: '5', suit: 'hearts' },
    ],
  },
  {
    name: 'Poker',
    cards: [
      { rank: 'K', suit: 'spades' },
      { rank: 'K', suit: 'hearts' },
      { rank: 'K', suit: 'diamonds' },
      { rank: 'K', suit: 'clubs' },
      { rank: '3', suit: 'spades' },
    ],
  },
  {
    name: 'Full House',
    cards: [
      { rank: 'J', suit: 'spades' },
      { rank: 'J', suit: 'hearts' },
      { rank: 'J', suit: 'diamonds' },
      { rank: '8', suit: 'clubs' },
      { rank: '8', suit: 'hearts' },
    ],
  },
  {
    name: 'Color',
    cards: [
      { rank: 'A', suit: 'diamonds' },
      { rank: 'J', suit: 'diamonds' },
      { rank: '8', suit: 'diamonds' },
      { rank: '5', suit: 'diamonds' },
      { rank: '2', suit: 'diamonds' },
    ],
  },
  {
    name: 'Escalera',
    cards: [
      { rank: '10', suit: 'spades' },
      { rank: '9', suit: 'hearts' },
      { rank: '8', suit: 'clubs' },
      { rank: '7', suit: 'diamonds' },
      { rank: '6', suit: 'spades' },
    ],
  },
  {
    name: 'Tercia',
    cards: [
      { rank: 'Q', suit: 'spades' },
      { rank: 'Q', suit: 'hearts' },
      { rank: 'Q', suit: 'diamonds' },
      { rank: '9', suit: 'clubs' },
      { rank: '4', suit: 'spades' },
    ],
  },
  {
    name: 'Dos Pares',
    cards: [
      { rank: 'A', suit: 'spades' },
      { rank: 'A', suit: 'hearts' },
      { rank: '7', suit: 'diamonds' },
      { rank: '7', suit: 'clubs' },
      { rank: '3', suit: 'hearts' },
    ],
  },
  {
    name: 'Par',
    cards: [
      { rank: '10', suit: 'hearts' },
      { rank: '10', suit: 'diamonds' },
      { rank: 'K', suit: 'spades' },
      { rank: '5', suit: 'clubs' },
      { rank: '2', suit: 'hearts' },
    ],
  },
  {
    name: 'Carta Alta',
    cards: [
      { rank: 'A', suit: 'spades' },
      { rank: 'J', suit: 'hearts' },
      { rank: '8', suit: 'diamonds' },
      { rank: '4', suit: 'clubs' },
      { rank: '2', suit: 'spades' },
    ],
  },
];
