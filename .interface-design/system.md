# Design System — Metepec Royal Flush

## Direction

Friends in Metepec checking balances and managing poker nights on their phones. Warm, trusted, intimate — like the home game table — but precise about money.

Derived from the logo: Metepec Arbol de la Vida in deep forest green + gold + warm terracotta.

## Layout Philosophy (Airbnb-inspired)

Content-first, borderless sections. Inspired by Airbnb's mobile patterns:

- **No card containers** on dashboard screens — content sits directly on the root background
- **Thin dividers** (`border-b border-sand-200 dark:border-sand-700`) separate sections instead of card borders
- **Each section owns its own padding** (`px-6 py-6`) — the ScrollView has no horizontal padding, allowing hero elements to go full-bleed
- **Generous whitespace** — base-8 spacing scale, `py-6` between sections minimum
- **Bold section titles** — `text-base font-sans-bold` as left-aligned anchors with `mb-4` gap to content

Note: Enclosed card containers (`rounded-xl border bg-sand-100`) are still used for forms, modals, and detail screens where containment matters. The borderless pattern applies to dashboard/overview screens.

## Color Palette

### `felt` (brand green — accent only)

Brand moments, badges, status indicators, avatar backgrounds. NOT a dominant surface color.

| Token | Hex | Usage |
|-------|-----|-------|
| felt-50 | `#eef7f1` | Light badge bg, selected item bg |
| felt-100 | `#d5edde` | Avatar bg (light), active badge bg (light) |
| felt-300 | `#72c496` | Avatar text (dark) |
| felt-400 | `#4aad74` | Selected item border (dark) |
| felt-500 | `#2a9d68` | Mid accent |
| felt-600 | `#1a7d52` | Avatar text (light), links, selected border |
| felt-700 | `#1a5038` | Logo green, strong accent, selected text (light) |
| felt-900 | `#153828` | Avatar bg (dark), active badge bg (dark) |

### `gold` (primary actions)

CTAs, active states, money highlights, tab bar active tint.

| Token | Hex | Usage |
|-------|-----|-------|
| gold-50 | `#fdf8eb` | Highlight bg (light) |
| gold-100 | `#f9edcc` | Admin/setup badge bg (light) |
| gold-300 | `#ecc05f` | Admin badge text (dark) |
| gold-400 | `#e4a832` | Tab active (dark), CTA text on dark |
| gold-500 | `#c49a3c` | Primary CTA bg, tab active (light) |
| gold-600 | `#a67b1e` | CTA pressed, admin label text |
| gold-700 | `#7e5c17` | Admin badge text (light) |
| gold-900 | `#5b421c` | Admin badge bg (dark) |

### `sand` (warm neutrals — replaces all grays)

Backgrounds, text, borders. Warm cream to warm charcoal.

| Token | Hex | Usage |
|-------|-----|-------|
| sand-50 | `#fdfbf7` | Light mode bg (replaces `bg-white`) |
| sand-100 | `#f7f3ec` | Card/input bg (light), elevated surface |
| sand-200 | `#ede8df` | Borders (light) |
| sand-300 | `#ddd6ca` | Input borders (light), stronger dividers |
| sand-400 | `#b5ac9e` | Muted/placeholder text |
| sand-500 | `#918779` | Secondary text (light) |
| sand-600 | `#736a5e` | Labels, tertiary text (light) |
| sand-700 | `#574f45` | Strong secondary, borders (dark) |
| sand-800 | `#3b352e` | Card/input bg (dark), elevated surface |
| sand-900 | `#252119` | Dark mode bg |
| sand-950 | `#1a1714` | Primary text (light), darkest dark bg |

### Semantic colors

- **Error/destructive:** Tailwind `red` (matches hearts/diamonds in cards)
- **Success:** `felt` green scale
- **Warning:** `gold` scale
- **Dev-only:** Tailwind `orange` (intentionally distinct from real palette)

## Depth

Borders only — low-opacity warm borders (`sand-200` light, `sand-700` dark). No shadows.

On dashboard screens: thin bottom-border dividers between sections (not card outlines).

## Surfaces

- Light mode root: `bg-sand-50`
- Dark mode root: `bg-sand-900`
- Cards/elevated: `bg-sand-100` (light) / `bg-sand-800` (dark)
- Never pure white (`bg-white`) or cold gray as surface

## Typography

### Headings — Merriweather (Google Fonts)
Warm serif for page titles. Signals trust and tradition — fits a group with established rules and money on the line.

| Class | Font | Usage |
|-------|------|-------|
| `font-heading` | Merriweather 700 Bold | Page titles (`text-2xl`, `text-xl`) |
| `font-heading-regular` | Merriweather 400 Regular | Taglines, decorative text |

### Body — Inter (Google Fonts)
Clean geometric sans for everything else. Readable at small sizes, works for data tables, labels, buttons.

| Class | Font | Usage |
|-------|------|-------|
| `font-sans` | Inter 400 Regular | Default body text |
| `font-sans-medium` | Inter 500 Medium | Emphasized body, labels |
| `font-sans-semibold` | Inter 600 SemiBold | Buttons, section headers |
| `font-sans-bold` | Inter 700 Bold | Bold body text, table values |

Fonts loaded via `@expo-google-fonts` in `app/_layout.tsx` with splash screen held until ready.

## Icons

### Package
`@tabler/icons-react-native` — outline-style icons, 2px stroke. Requires `react-native-svg`.

### Usage
Import individual icons directly. Pass `size` and `color` as props.
```tsx
import { IconTrophy } from '@tabler/icons-react-native';
<IconTrophy size={18} color={iconColor} />
```

### Dark mode
Tabler icons accept a `color` string prop — cannot use Tailwind classes. Use `useColorScheme()` to switch:
```tsx
const colorScheme = useColorScheme();
const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779'; // sand-400 / sand-500
```

### When to use icons
- **Section titles** — small leading icon (18px) for scanability. Icon color: `sand-500` (light) / `sand-400` (dark).
- **Navigation tabs** — 28px Tabler icons. Color managed by tab bar (`color` prop from Expo Router).
- **Info rows / data labels** — text only. Icons don't add meaning here.

### Established icons
| Context | Label | Icon | Import |
|---------|-------|------|--------|
| Tab bar | Temporada | Trophy | `IconTrophy` |
| Tab bar | Juego | Playing cards | `IconCards` |
| Tab bar | Registro | Book | `IconBook` |
| Tab bar | Perfil | User | `IconUser` |
| Section title | Temporada | Trophy | `IconTrophy` |
| Section title | Juego | Playing cards | `IconCards` |
| Section title | Rotación de Host | Shuffle arrows | `IconArrowsShuffle` |

### Deprecated: IconSymbol
`components/ui/icon-symbol.tsx` and `icon-symbol.ios.tsx` are no longer imported anywhere. They wrapped SF Symbols (iOS) / Material Icons (Android). Safe to delete.

## Tab Bar

- Active tint (light): `gold-500` (`#c49a3c`)
- Active tint (dark): `gold-400` (`#e4a832`)
- Inactive icon (light): `sand-500` (`#918779`)
- Inactive icon (dark): `sand-400` (`#b5ac9e`)

## Component Patterns

### CTA Buttons (pill)
```
rounded-full bg-gold-500 py-3.5 active:bg-gold-600 text-white
```

### Secondary Buttons (pill outline)
```
rounded-full border border-sand-300 py-3 active:bg-sand-100 text-sand-700
dark:border-sand-600 dark:active:bg-sand-700 dark:text-sand-300
```

### Destructive Buttons (pill)
```
rounded-full bg-red-600 py-3.5 active:bg-red-700 text-white
Disabled: bg-red-300 dark:bg-red-800
```

### Disabled Buttons
```
bg-sand-300 text-sand-500
dark:bg-sand-700 dark:text-sand-400
```

### Text Inputs
```
border border-sand-300 bg-sand-100 text-sand-950
dark:border-sand-600 dark:bg-sand-800 dark:text-sand-50
placeholderTextColor="#b5ac9e"
```

### Status Badges
- **Active:** `bg-felt-100 text-felt-700` / `dark:bg-felt-900 dark:text-felt-300`
- **Setup:** `bg-gold-100 text-gold-700` / `dark:bg-gold-900 dark:text-gold-300`
- **Admin:** `bg-gold-100 text-gold-700` / `dark:bg-gold-900 dark:text-gold-300`

### Avatar Circles
```
bg-felt-100 text-felt-600
dark:bg-felt-900 dark:text-felt-300
```

### Selected Items (radio/list)
```
border-felt-600 bg-felt-50 text-felt-700
dark:border-felt-400 dark:bg-felt-900/30 dark:text-felt-300
```

### Info Cards (forms/detail screens only)
```
rounded-xl border border-sand-200 bg-sand-100 p-4
dark:border-sand-700 dark:bg-sand-800
```

### Content Section (dashboard screens)
```
border-b border-sand-200 px-6 py-6 dark:border-sand-700
```
Section title uses `SectionTitle` component with leading Tabler icon:
```tsx
<SectionTitle icon={<IconTrophy size={18} color={iconColor} />} label="Temporada" />
```
Renders as: `flex-row items-center gap-2 mb-4` with `text-base font-sans-bold` label.

### Full-Bleed Hero (balance, highlights)
```
bg-gold-50 px-6 py-8 dark:bg-gold-900/30
```
No border, no rounded corners — warm tint runs edge-to-edge.

### Info Row
```
Label: text-sm text-sand-500 dark:text-sand-400
Value: text-sm font-sans-semibold text-sand-950 dark:text-sand-50
Row gap: mb-3 (last:mb-0)
```

## Files

| File | Role |
|------|------|
| `tailwind.config.js` | Color token definitions (felt, gold, sand) |
| `constants/theme.ts` | Tab bar + navigation theme colors |
| `global.css` | Tailwind base/components/utilities |
| `components/ui/icon-symbol.tsx` | **Deprecated** — no longer imported. Safe to delete. |

## Dependencies

| Package | Purpose |
|---------|---------|
| `@tabler/icons-react-native` | Feature icons (section titles, UI accents) |
| `react-native-svg` | Required by Tabler icons |
| `@expo-google-fonts/*` | Inter + Merriweather fonts |
| `expo-symbols` | SF Symbols on iOS (tab bar) |
| `@expo/vector-icons` | Material Icons fallback (tab bar) |
