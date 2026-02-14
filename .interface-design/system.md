# Design System — Metepec Royal Flush

## Direction

Friends in Metepec checking balances and managing poker nights on their phones. Warm, trusted, intimate — like the home game table — but precise about money.

Derived from the logo: Metepec Arbol de la Vida in deep forest green + gold + warm terracotta.

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

## Surfaces

- Light mode root: `bg-sand-50`
- Dark mode root: `bg-sand-900`
- Cards/elevated: `bg-sand-100` (light) / `bg-sand-800` (dark)
- Never pure white (`bg-white`) or cold gray as surface

## Typography

System fonts (configured in `constants/theme.ts`). Hierarchy via weight/size only.

## Tab Bar

- Active tint (light): `gold-500` (`#c49a3c`)
- Active tint (dark): `gold-400` (`#e4a832`)
- Inactive icon (light): `sand-500` (`#918779`)
- Inactive icon (dark): `sand-400` (`#b5ac9e`)

## Component Patterns

### CTA Buttons
```
bg-gold-500 active:bg-gold-600 text-white
```

### Secondary/Cancel Buttons
```
border border-sand-300 active:bg-sand-100 text-sand-700
dark:border-sand-600 dark:active:bg-sand-800 dark:text-sand-300
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

### Info Cards
```
rounded-xl border border-sand-200 bg-sand-100 p-4
dark:border-sand-700 dark:bg-sand-800
```

### Info Row (inside cards)
```
Label: text-sand-500 dark:text-sand-400
Value: text-sand-950 dark:text-sand-50 font-medium
```

## Files

| File | Role |
|------|------|
| `tailwind.config.js` | Color token definitions (felt, gold, sand) |
| `constants/theme.ts` | Tab bar + navigation theme colors |
| `global.css` | Tailwind base/components/utilities |
