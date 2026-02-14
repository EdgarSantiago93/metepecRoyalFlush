# App State Router

## Purpose

The App State Router is bootstrap logic that inspects the current season/session state after authentication and routes each tab to the correct sub-component. It replaces the placeholder tab screens with dynamic content based on whether a season exists, its status, and whether there's an active session.

## Architecture

### AppState — discriminated union

```
loading → no_season | season_setup | season_active | season_ended | error
```

The state is modeled as a TypeScript discriminated union on the `status` field, enabling exhaustive `switch` statements with full type narrowing in each branch.

### Provider hierarchy

```
AuthProvider (root layout)
  └── AppStateProvider (tabs layout — only mounts when authenticated)
        ├── Season tab → reads useAppState()
        ├── Session tab → reads useAppState()
        ├── Ledger tab → reads useAppState()
        └── Profile tab → reads useAppState() (dev toggle only)
```

`AppStateProvider` lives inside `(tabs)/_layout.tsx` so it only loads when the user is authenticated. On logout, the provider unmounts cleanly.

### Content switching

Tabs remain fixed. Each tab reads `useAppState()` and renders the appropriate sub-component:

| Tab | no_season | season_setup | season_active | season_ended |
|-----|-----------|--------------|---------------|--------------|
| Season | NoSeason (+ Create form for admin) | SeasonSetup dashboard | SeasonActive overview | SeasonEnded (+ Create for admin) |
| Session | NoSeasonSession | NoSeasonSession | NoSession / SessionActive | NoSeasonSession |
| Ledger | NoSeasonLedger | LedgerContent | LedgerContent | LedgerContent |
| Profile | unchanged | unchanged | unchanged | unchanged |

## Usage

### Reading app state in a component

```tsx
import { useAppState } from '@/hooks/use-app-state';

function MyComponent() {
  const appState = useAppState();

  switch (appState.status) {
    case 'loading':
      // ...
    case 'no_season':
      // appState.users is available
    case 'season_active':
      // appState.season, appState.members, appState.session, appState.users
  }
}
```

### Creating a season

The `createSeason` action is available on the context:

```tsx
const { createSeason } = useAppState();
await createSeason({ treasurerUserId: '...', name: 'Season Feb 2026' });
// State automatically transitions to season_setup
```

### Dev State Toggle

In development (`__DEV__`), the Profile tab includes a toggle with 5 presets:

- `no_season` — No season exists
- `season_setup` — Season in setup phase
- `season_active_no_session` — Active season, no session
- `season_active_with_session` — Active season with in-progress session
- `season_ended` — Season has ended

Each preset populates the mock store with realistic data and triggers a state refresh.

## API

### `AppStateProvider`

Wraps children with the app state context. Must be inside `AuthProvider`.

### `useAppState(): AppStateContextValue`

Returns the current app state plus actions:

| Field | Type | Description |
|-------|------|-------------|
| `status` | `'loading' \| 'error' \| 'no_season' \| 'season_setup' \| 'season_active' \| 'season_ended'` | Current state discriminant |
| `season` | `Season` | Available when status is setup/active/ended |
| `members` | `SeasonMember[]` | Available when status is setup/active/ended |
| `session` | `Session \| null` | Available when status is season_active |
| `users` | `User[]` | Available in all non-loading/error states |
| `createSeason(req)` | `(req: CreateSeasonRequest) => Promise<void>` | Creates a season and transitions state |
| `refresh()` | `() => Promise<void>` | Re-fetches all data |
| `_devSetPreset(key)` | `(key: PresetKey) => Promise<void>` | Dev only: switch mock state preset |

## Files

| File | Purpose |
|------|---------|
| `contexts/app-state-context.tsx` | Provider + discriminated union types |
| `hooks/use-app-state.ts` | Convenience hook |
| `data/seed-seasons.ts` | Mock store + 5 preset factories |
| `components/ui/loading-view.tsx` | Full-screen loading spinner |
| `components/ui/error-view.tsx` | Error display with retry |
| `components/season/no-season.tsx` | No season CTA |
| `components/season/create-season-form.tsx` | Create season form |
| `components/season/season-setup.tsx` | Setup dashboard placeholder |
| `components/season/season-active.tsx` | Active season placeholder |
| `components/season/season-ended.tsx` | Ended state + create CTA |
| `components/session/no-season-session.tsx` | No season message |
| `components/session/no-session.tsx` | No session message |
| `components/session/session-active.tsx` | Active session placeholder |
| `components/ledger/no-season-ledger.tsx` | No season placeholder |
| `components/ledger/ledger-content.tsx` | Ledger placeholder |
| `components/profile/dev-state-toggle.tsx` | Dev preset switcher |
