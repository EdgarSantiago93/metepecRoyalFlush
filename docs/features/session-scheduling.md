# Session Scheduling

## Purpose

Allows Treasurer or Admin to schedule, edit, and start a poker session within an active season. Only one non-finalized session can exist per season at a time.

## Session lifecycle (Phase 2 scope)

```
(no session) → scheduled → dealing → ...future phases
```

- **Schedule**: Treasurer/Admin picks a host (from rotation order), optional date/time text, optional location
- **Edit**: While in `scheduled` state, the same fields can be updated
- **Start**: Transitions session from `scheduled` → `dealing`

## Screens & Components

### Schedule Session Screen (`app/schedule-session.tsx`)

- Root-level Stack screen, registered in `_layout.tsx`
- Supports create and edit modes via `?edit=1` query param
- Guards: requires `season_active` status + Treasurer or Admin role
- Uses `SessionScheduleForm` for the actual form UI

### Session Schedule Form (`components/session/session-schedule-form.tsx`)

Shared form component for both create and edit:

| Prop | Type | Description |
|------|------|-------------|
| `hostOrder` | `SeasonHostOrder[]` | Host rotation list |
| `users` | `User[]` | All users for display names |
| `initialValues?` | `{ hostUserId, scheduledFor?, location? }` | Pre-fill for edit mode |
| `submitLabel` | `string` | Button text ("Schedule Session" or "Save Changes") |
| `onSubmit` | `(data) => Promise<void>` | Submit handler |
| `onCancel` | `() => void` | Cancel handler |

Fields:
- **Host** (required): Radio-style picker sorted by host rotation order
- **Date/Time** (optional): Free-text input (e.g. "Saturday 8pm")
- **Location** (optional): Free-text input

### Session Tab Updates

- **NoSession** (`components/session/no-session.tsx`): Shows "Schedule Session" button for Treasurer/Admin, waiting message for others
- **SessionActive** (`components/session/session-active.tsx`): Dispatches on `session.state`:
  - `scheduled`: Shows session details + "Start Session" / "Edit Schedule" buttons (Treasurer/Admin)
  - Other states: Placeholder for future phases

### Season Active Dashboard (`components/season/season-active.tsx`)

Full dashboard with:
- Season name + Active badge
- Your Balance card (current member's balance in MXN)
- Summary (treasurer, member count)
- Session status card (no session / scheduled / in-progress)
- Host rotation preview (read-only numbered list)
- Admin actions (Edit Host Order)

## API Methods

| Method | Description |
|--------|-------------|
| `scheduleSession(req)` | Create a new session in `scheduled` state |
| `updateScheduledSession(req)` | Edit host/date/location of a scheduled session |
| `startSession(sessionId)` | Transition session from `scheduled` → `dealing` |

## Dev Toggle

Use the "Active (scheduled)" preset in Profile → Dev Tools to test the scheduled session state.

## Key Decisions

- **Single screen for create + edit**: Query param `?edit=1` instead of separate screens
- **Free-text date/time**: Avoids adding a date picker dependency; fits casual group context
- **`startSession` → `dealing`**: This is the Phase 2/3 boundary
