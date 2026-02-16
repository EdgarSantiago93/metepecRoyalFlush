# Ledger Phase

## Purpose

The Ledger provides the read-only "truth view" of the season, replacing the Excel spreadsheet the poker group previously used. It shows current standings, season event history, and detailed drill-downs for both sessions and players.

## Structure

The Ledger tab is organized into two views accessed via a segmented tab control:

### Standings Tab

An Excel-like table showing all approved season members with:

- **Player** (name, tappable to player detail)
- **Balance** (current season balance in MXN)
- **Games** (number of finalized sessions played)
- **Rebuys** (total rebuy count across all sessions)
- **Total PnL** (cumulative profit/loss across all finalized sessions)

Features:
- **Sortable columns**: Tap any header to sort ascending/descending. Active sort column is highlighted in gold.
- **Horizontal scroll**: Table is horizontally scrollable for smaller screens.
- **In-progress badge**: When a session is live (dealing/in_progress/closing), a gold badge appears at the top.

### Timeline Tab

A chronological feed of all season events, newest first:

- **Session Finalized** events (tappable to session detail)
- **Buy-in** events (each player's initial buy-in)
- **Rebuy** events (approved rebuys with type and amount)
- **PnL Report** events (per-player profit/loss from each session)

Features:
- **Pagination**: Shows 20 events at a time with "Load more" button.
- **In-progress badge**: Same live session indicator as Standings tab.

## Drill-downs

### Session Detail (`/ledger-session-detail`)

Shows a finalized session's complete breakdown:
- Session info card (date, location, host, finalized by)
- Results table (start, rebuys, ending, PnL per participant)
- Sum PnL with balance indicator
- Resolution note (if override finalization was used)
- Rebuy timeline (chronological, approved only)
- Ending submissions list (validated status and amounts)

Player names in the results table are tappable to navigate to player detail.

### Player Detail (`/ledger-player-detail`)

Shows a player's season performance:
- Stats cards: Current Balance, Total PnL, Sessions Played, Total Rebuys
- Session history table with per-session breakdown (host, date, start, end, rebuys, PnL)
- Session rows are tappable to navigate to session detail.

## Data Layer

### New API Endpoints

- `getSeasonSessions(seasonId)` - Returns all sessions (finalized + current) for a season, sorted newest first.
- `getSessionDetail(sessionId)` - Returns full session detail including participants, injections, ending submissions, and finalize note.

### Mock Store Extension

- Added `finalizedSessions: Session[]` to `MockStore` to support storing historical session data alongside the current live session.

### Multi-Session Seed Preset

A new dev preset `season_active_multi_session` provides:
- 3 finalized sessions with varied player participation (4-6 players each)
- 1 in-progress session
- Realistic PnL data (all sessions balanced, sum=0)
- Different hosts, dates, and locations
- Varied rebuy patterns across sessions

Use the "Active (multi-session ledger)" button in Profile > Dev Tools to activate.

## Navigation

| Route | Screen | Params |
|---|---|---|
| `/(tabs)/ledger` | Main ledger with tabs | - |
| `/ledger-session-detail` | Session drill-down | `sessionId: string` |
| `/ledger-player-detail` | Player drill-down | `userId: string` |

## Files

### New Files
- `components/ledger/standings-tab.tsx` - Standings table with sorting
- `components/ledger/timeline-tab.tsx` - Event timeline with pagination
- `components/ledger/ledger-session-detail.tsx` - Session detail component
- `components/ledger/ledger-player-detail.tsx` - Player detail component
- `app/ledger-session-detail.tsx` - Session detail route
- `app/ledger-player-detail.tsx` - Player detail route

### Modified Files
- `components/ledger/ledger-content.tsx` - Rewritten with tabs and data fetching
- `app/(tabs)/ledger.tsx` - Passes session prop to LedgerContent
- `app/_layout.tsx` - Added new Stack.Screen entries
- `data/seed-seasons.ts` - Added `finalizedSessions` to MockStore + multi-session preset
- `services/api/client.ts` - Added `getSeasonSessions` and `getSessionDetail`
- `services/api/types.ts` - Added response types for new endpoints
- `components/profile/dev-state-toggle.tsx` - Added multi-session preset option
