# In Progress & Rebuys (Phase 4)

## Purpose

Manages the **in-progress** session phase where players are actively playing poker. Players can request rebuys, the treasurer approves/rejects them, and the approved rebuy feed shows a live timeline. The treasurer can end the session when play concludes.

## Session Flow

```
dealing → [Move to In Progress] → in_progress → [End Session] → closing
```

### In Progress Phase
- Players see their personal stats (starting stack, approved rebuys, pending count)
- Players request rebuys via +$500 / +$250 buttons with optional camera photo proof
- Treasurer sees pending rebuy requests inline with approve/reject actions
- All players see the roster with running approved-injection totals per player
- Approved rebuys feed shows chronological timeline of approved injections

### End Session (in_progress → closing)
- Treasurer/Admin taps "End Session" → destructive confirmation modal
- Blocks all future rebuy requests
- Transitions session to `closing` state

## Components

### `InProgressPlayerView` (`components/session/in-progress-player-view.tsx`)
Player's personal view with:
- Stats card: starting stack, approved rebuys total, pending count
- Rebuy buttons: "$500 Rebuy" (filled gold) and "$250 Rebuy" (outlined gold)
- Confirmation modal with optional photo attachment (camera or library via `expo-image-picker`)

### `InProgressRoster` (`components/session/in-progress-roster.tsx`)
Participant table with columns: Name, Start, Rebuys, Total In.
- Total In = starting stack + approved rebuys

### `RebuyApprovals` (`components/session/rebuy-approvals.tsx`)
Treasurer-only component showing pending rebuy requests:
- Per-injection card with player name, amount, type badge, timestamp, optional proof photo
- Approve (felt-green) / Reject (requires note, red) actions
- Cards disappear from pending list after review

### `SessionInProgress` (`components/session/session-in-progress.tsx`)
Main layout:
- Felt-green banner with host + location + pending rebuy count badge
- `<InProgressPlayerView />` for current user
- `<RebuyApprovals />` (treasurer/admin only)
- `<InProgressRoster />` for all users
- Approved rebuys feed (chronological)
- "End Session" button (treasurer/admin, destructive variant)
- Pull-to-refresh for participants + injections

## API Methods

| Method | Purpose |
|--------|---------|
| `getSessionInjections(sessionId)` | List all injections for a session |
| `requestRebuy(req)` | Create pending injection (only in_progress) |
| `reviewInjection(req)` | Approve/reject injection (only in_progress) |
| `endSession(sessionId)` | Transition in_progress → closing |

## App State Context

New fields on `season_active` state:
- `injections: SessionInjection[]` — fetched when session is `in_progress`

New actions:
- `requestRebuy(type, proofPhotoUrl?)` — request a rebuy
- `reviewInjection(injectionId, action, note?)` — approve/reject
- `endSession()` — transition to closing (full reload)
- `refreshInjections()` — refresh injection list only

## Dev Preset

`season_active_in_progress` — Session in `in_progress` state with:
- 4 confirmed participants (Edgar, Carlos, Miguel, Andres)
- Sample injections: 1 approved (Edgar $500), 2 pending (Miguel $500, Carlos $250), 1 rejected (Andres $250)

## Enforcement

- Rebuys can only be requested while session state is `in_progress`
- Rebuys can only be reviewed while session state is `in_progress`
- "End Session" transitions to `closing`, blocking all future rebuys

## Image Picker

Uses `expo-image-picker` (already configured in `app.json`):
- Attempts camera first, falls back to media library
- Photos captured at 0.7 quality for size optimization
- Photo URI stored as `proofPhotoUrl` on the injection record
