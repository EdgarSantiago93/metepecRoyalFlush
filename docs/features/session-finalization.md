# Session Finalization (Phase 6)

## Purpose

Enables the treasurer/admin to verify session balance integrity and finalize a session after all ending stack submissions have been validated. On finalization, season member balances are updated to reflect each participant's ending stack.

## Flow

1. During the **closing** phase, the treasurer validates all ending submissions
2. Once all submissions are validated, a "Review & Finalize" button appears
3. Tapping it opens the **Balance Check** screen showing per-participant PnL
4. If `Sum(PnL) == 0` (balanced), the treasurer can finalize immediately
5. If `Sum(PnL) != 0` (mismatch), finalization is blocked unless the treasurer overrides with a required resolution note
6. On finalize:
   - Session state becomes `finalized`
   - `finalizedAt` and `finalizedByUserId` are set
   - Each **member** participant's `season_members.current_balance_mxn` is updated to their ending stack
   - If an override was needed, a `session_finalize_notes` record is created
7. The session view transitions to the **Session Summary** (read-only)

## Components

### `SessionFinalize` (`components/session/session-finalize.tsx`)
- **Purpose**: Balance check screen with PnL table and Finalize action
- **Props**: session, season, members, participants, injections, endingSubmissions, users
- **Features**:
  - Per-participant PnL table (starting, rebuys, ending, computed PnL)
  - Totals row
  - Balance indicator (green = balanced, red = mismatch)
  - Override flow with required resolution note when not balanced
  - Finalize button (enabled only when conditions are met)
- **Access**: Treasurer/Admin only (via closing view)

### `SessionFinalized` (`components/session/session-finalized.tsx`)
- **Purpose**: Read-only session summary after finalization
- **Props**: session, season, members, participants, injections, endingSubmissions, finalizeNote, users
- **Features**:
  - Session info card (date, location, finalized by, finalized at)
  - PnL results table with color-coded PnL values
  - Resolution note display (if override was used)
  - Approved rebuys timeline
  - Updated season balances table with "played" badges

## API Endpoints (Mock)

### `finalizeSession(req: FinalizeSessionRequest)`
- **Input**: `{ sessionId, overrideNote? }`
- **Validates**:
  - Session is in `closing` state
  - All participants have validated submissions
  - If not balanced, `overrideNote` is required
- **Effects**:
  - Sets session state to `finalized`
  - Updates member balances
  - Creates finalize note if override used
- **Returns**: Updated session, members, and optional finalize note

### `getSessionFinalizeNote(sessionId: string)`
- Returns the finalize note for a session (if any)

## PnL Computation

```
SessionPnL = EndingStack - StartingStack - Sum(ApprovedInjections)
```

Balancing invariant: `Sum(SessionPnL for all participants) == 0`

## Dev Preset

- **"Active (finalized)"**: Pre-built finalized session with 4 participants:
  - Edgar: start=500, rebuys=500, ending=850, PnL=-150
  - Carlos: start=500, rebuys=0, ending=600, PnL=+100
  - Miguel: start=500, rebuys=0, ending=300, PnL=-200
  - Andres: start=500, rebuys=0, ending=750, PnL=+250
  - Sum PnL = 0 (balanced)

## State Context Changes

- `AppState.season_active` now includes `finalizeNote: SessionFinalizeNote | null`
- New action: `finalizeSession(overrideNote?: string)`
- `load()` fetches participants, injections, submissions, and finalize note for finalized sessions
