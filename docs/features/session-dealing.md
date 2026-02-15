# Session Dealing (Phase 3)

## Purpose

Handles the transition from a **scheduled** session to an **in-progress** game night. The dealing phase is where players check in, receive their starting stacks, and confirm before play begins.

## Session Flow

```
scheduled → [Start Session] → dealing → [Move to In Progress] → in_progress
```

### Start Session (scheduled → dealing)
- Treasurer/Admin taps "Start Session" on the scheduled session view
- **Confirmation modal** appears before transition
- Sets `startedAt` and transitions session state to `dealing`

### Dealing Phase
- **Players** check in and confirm their starting stacks
- **Treasurer** sees a roster of all participants with statuses
- **Treasurer** can remove participants via swipe-to-remove

### Move to In Progress (dealing → in_progress)
- Treasurer/Admin taps "Move to In Progress" button
- Button is disabled until: ≥2 checked in AND all checked-in are confirmed (no unconfirmed or disputed)
- Helper text explains why the button is disabled

## Components

### `ConfirmationModal` (`components/ui/confirmation-modal.tsx`)
Reusable modal with dark overlay + centered card.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | — | Modal visibility |
| `title` | `string` | — | Modal title |
| `message` | `string` | — | Body text |
| `confirmLabel` | `string` | `'Confirm'` | Confirm button label |
| `cancelLabel` | `string` | `'Cancel'` | Cancel button label |
| `variant` | `'default' \| 'destructive'` | `'default'` | Gold (default) or red (destructive) confirm button |
| `onConfirm` | `() => void` | — | Confirm handler |
| `onCancel` | `() => void` | — | Cancel handler |
| `loading` | `boolean` | `false` | Shows spinner on confirm, disables both buttons |

### `DealingPlayerView` (`components/session/dealing-player-view.tsx`)
Player's personal view with 4 states:

1. **Not checked in** — "Check In" button with blind rule warning modal
2. **Awaiting confirmation** — Shows expected stack amount, Confirm/Dispute buttons
3. **Confirmed** — Success card with starting stack display
4. **Disputed** — Warning card with dispute note, waiting for treasurer

### `DealingRoster` (`components/session/dealing-roster.tsx`)
Treasurer/Admin roster table with:
- Name, Starting Stack, Status columns
- Status badges: Not here (sand), Checked in (gold), Confirmed (green), Disputed (red)
- Swipe-to-remove with destructive confirmation modal
- Summary footer: "X checked in, Y confirmed of Z members"

### `SessionDealing` (`components/session/session-dealing.tsx`)
Main layout component:
- Gold banner with host + location
- `<DealingPlayerView />` for current user
- `<DealingRoster />` (treasurer/admin only)
- "Move to In Progress" button (treasurer/admin only)
- Pull-to-refresh for participant updates

## API Methods

| Method | Purpose |
|--------|---------|
| `getSessionParticipants(sessionId)` | List active (non-removed) participants |
| `checkInToSession(sessionId)` | Create participant record for current user |
| `confirmStartingStack(sessionId, participantId)` | Set `confirmedStartAt` |
| `disputeStartingStack(req)` | Set `startDisputeNote` |
| `removeParticipant(sessionId, participantId)` | Set `removedAt` |
| `moveSessionToInProgress(sessionId)` | Validate + transition dealing → in_progress |

## App State Context

New fields on `season_active` state:
- `participants: SessionParticipant[]` — fetched when session is in dealing/in_progress

New actions:
- `checkIn()` — check in current user
- `confirmStart(participantId)` — confirm starting stack
- `disputeStart(participantId, note)` — dispute with note
- `removeParticipant(participantId)` — remove from session
- `moveToInProgress()` — transition to in_progress (full reload)
- `refreshParticipants()` — refresh participant list only

## Dev Preset

`season_active_dealing` — Session in dealing state with sample participants:
- Carlos (treasurer): checked in + confirmed
- Miguel (host): checked in, not confirmed
- Andres: checked in, disputed ("I received 450 not 500")
- Edgar (current user): NOT checked in

## Deferred

- **Add Guest modal** — deferred to a follow-up phase
