# Poker Hands Reference

## Purpose

A quick-reference page that shows the 10 standard poker hand rankings in Spanish, from highest (Escalera Real) to lowest (Carta Alta). Each hand is displayed with its name and a visual example using styled mini playing card components. Accessible from every session screen via an info icon button.

## Access

- Available from **all session sub-screens** (info icon button in top-right header area)
- Route: `/poker-hands`
- Presentation: `modal` (slides up over current screen)

## Screens where the button appears

| Screen | Component | Button placement |
|--------|-----------|------------------|
| Scheduled | `SessionScheduled` (in `session-active.tsx`) | Header row, right side |
| Dealing | `SessionDealing` | Header row, right side |
| In Progress | `SessionInProgress` | Header row, right side |
| Closing | `SessionClosing` | Header row, right side |
| Finalized | `SessionFinalized` | Header row, right side |
| No Session | `NoSession` | Absolute positioned, top-right |
| No Season | `NoSeasonSession` | Absolute positioned, top-right |

## Hand Rankings (highest to lowest)

1. **Escalera Real** -- A K Q J 10 (same suit)
2. **Escalera de Color** -- 9 8 7 6 5 (same suit)
3. **Poker** -- K K K K 3
4. **Full House** -- J J J 8 8
5. **Color** -- A J 8 5 2 (same suit)
6. **Escalera** -- 10 9 8 7 6 (mixed suits)
7. **Tercia** -- Q Q Q 9 4
8. **Dos Pares** -- A A 7 7 3
9. **Par** -- 10 10 K 5 2
10. **Carta Alta** -- A J 8 4 2 (no combination)

## Components

### `MiniCard` (`components/poker-hands/mini-card.tsx`)
- Renders a small playing card with rank and suit symbol
- Uses Unicode suit characters (no external assets)
- Red for hearts/diamonds, black (white in dark mode) for spades/clubs
- Fixed size: 38x52px with rounded corners and border

### `HandRow` (`components/poker-hands/hand-row.tsx`)
- Displays one hand: gold-numbered badge, Spanish name, and 5 mini cards
- Wrapped in a rounded card with border

### `PokerHandsButton` (`components/session/poker-hands-button.tsx`)
- Reusable `Pressable` with `IconInfoCircle` from tabler icons
- Navigates to `/poker-hands` on press
- Has accessibility label and role

## Data

Hand definitions live in `constants/poker-hands.ts` and export:
- `POKER_HANDS` -- array of 10 hands with cards
- `SUIT_SYMBOLS` -- Unicode suit characters
- `SUIT_COLORS` / `SUIT_COLORS_DARK` -- suit colors for light/dark mode
- TypeScript types: `Suit`, `Card`, `PokerHand`
