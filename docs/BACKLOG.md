# Backlog — Poker Season Ledger App (v1)

Single source of truth for all v1 work items, organized by development phase.

## Legend

- `[ ]` — not started
- `[x]` — merged to main
- **Screens ref** — maps to `screens.md` section numbers (1.1–5.1)
- **Tables ref** — maps to `datamodels.md` table names
- Items within a phase can be built in any order unless noted
- Each phase depends on previous phases being complete

---

## Phase 0: Foundation

Infrastructure that everything else builds on.

- [x] **Navigation shell** — Bottom tab navigator with 4 tabs: Season, Session, Ledger, Profile. Placeholder screens for each tab.
  - Screens: global nav
  - PR: #4
- ~~**Database setup**~~ — Turso/SQLite client, connection config, schema migration runner, ULID generation utility. Out of scope for mobile app; handled entirely in backend (NestJS).
  - Tables: `users`, `seasons`, `season_members`, `season_deposit_submissions`, `season_host_order`, `sessions`, `session_participants`, `session_injections`, `ending_submissions`, `session_finalize_notes`, `notifications`
- [x] **Auth: login + session** — Login screen (email field, "Send login link"), magic-link flow, allowlisted-email guard, persistent auth state. Currently uses mock API client swappable for real backend.
  - Screens: 1.1
  - Tables: `users`
  - PR: #5
- [x] **App state router** — Bootstrap logic that routes the user to the correct screen based on current app state (no season → create season, season in setup → season setup, active season → session home, etc.).
  - Screens: 1.2
  - PR: #6

---

## Phase 1: Season Setup

Creating and configuring a season before play begins.

- [x] **Create Season screen** — Admin-only form: assign treasurer (dropdown), optional season name. On save: create season record (`status=setup`), initialize host order, initialize deposit statuses.
  - Screens: 2.5 (partial — season creation)
  - Tables: `seasons`, `season_members`, `season_host_order`
  - PR: #6
- [x] **Season Setup Dashboard** — Hub for setup phase showing deposit status list, host order preview, progress card, role-based action buttons (upload deposit, review deposits, edit host order, season settings, start season).
  - Screens: 2.1 (setup state), 2.4
  - Tables: `seasons`, `season_members`
  - PR: #7, #8
- [x] **Upload Deposit Proof screen** — Photo picker/camera, optional note, submit. Shows current status (pending/approved/rejected). Re-upload allowed after rejection.
  - Screens: 2.2
  - Tables: `season_deposit_submissions`
  - PR: #7
- [x] **Deposit Approvals screen** — Treasurer view: member list with status filters (all/pending/approved/rejected/not submitted). Detail view: proof photo, approve/reject (reject requires note), submission history. On approve: set `season_members.current_balance_mxn = 500`.
  - Screens: 2.3
  - Tables: `season_deposit_submissions`, `season_members`
  - PR: #7
- [x] **Host Order Planning screen** — Admin-only: randomize button, drag-and-drop reorder (long-press + pan gesture with haptics), save.
  - Screens: 2.5 (partial — host order)
  - Tables: `season_host_order`
  - PR: #7, #8, #9, #10
- [x] **Season Settings screen** — Admin-only: change treasurer.
  - Screens: 2.5 (partial — settings)
  - Tables: `seasons`
  - PR: #7
- [x] **Start Season action** — Treasurer-only button on setup dashboard. Enabled when ≥2 members approved. On start: `status=active`, persist `started_at`.
  - Screens: 2.4
  - Tables: `seasons`, `season_members`
  - PR: #7
- [x] **Season Home screen (active state)** — Stateful hub showing season status, treasurer name, player's current balance, deposit status badge, host order preview (read-only). Role-based action buttons.
  - Screens: 2.1 (active state)
  - Tables: `seasons`, `season_members`

---

## Phase 2: Session Scheduling

Creating and editing scheduled sessions within an active season.

- [x] **Session Home (stateful hub)** — Renders different UI based on session state: no session ("Waiting for next session"), scheduled (host/date/location + Start/Edit actions), dealing/in_progress/closing/finalized (placeholder for future phases). Role-based actions throughout.
  - Screens: 3.1
  - Tables: `sessions`, `session_participants`
- [x] **Schedule Next Session** — Treasurer/Admin form: host picker (from host order), optional date/time, optional location. On save: create session (`state=scheduled`). Enforces one non-finalized session at a time.
  - Screens: 3.2
  - Tables: `sessions`
- [x] **Edit Scheduled Session** — Same form as Schedule, prefilled with current values (`?edit=1` param). On save: update session.
  - Screens: 3.3
  - Tables: `sessions`

---

## Phase 3: Session Setup & Dealing

Starting a session and managing check-in / starting stack confirmation.

- [ ] **Start Session action** — Treasurer/Admin confirmation dialog. On confirm: set `started_at`, transition to `dealing` state.
  - Screens: 3.4
  - Tables: `sessions`
- [ ] **Check-in & Dealing Dashboard** — Player view: "Check in" button, then "You should receive $X" with confirm/dispute. Treasurer view: live roster list (name, type, starting stack, checked-in status, confirmed status), kick/remove player. Starting stack auto-derived from season balance (500 for first session, last ending stack otherwise).
  - Screens: 3.5
  - Tables: `session_participants`, `season_members`
- [ ] **Add Guest modal** — Treasurer action: select existing user (guest with app) or create ephemeral guest (name only). On save: add to roster, auto-create initial buy-in 500 (pending approval), auto-check-in.
  - Screens: 3.5 (sub-flow per session.md §4)
  - Tables: `session_participants`, `session_injections`
- [ ] **Move to In Progress guard** — Button enabled only when all checked-in participants confirmed starting stack and ≥2 participants. Transition to `in_progress` state.
  - Screens: 3.5 (action)
  - Tables: `sessions`

---

## Phase 4: In Progress (Live Play)

Rebuy requests and approvals during active play.

- [ ] **In Progress session view** — Participants list with running approved-injection totals per player. Rebuy feed (timeline). Treasurer/Admin: "End Session" action.
  - Screens: 3.1 (in_progress state)
  - Tables: `session_participants`, `session_injections`
- [ ] **Request Rebuy** — Player action: +500 / +250 buttons, optional proof photo, submit. Creates pending injection record.
  - Screens: 3.6
  - Tables: `session_injections`
- [ ] **Rebuy Approvals** — Treasurer view: pending requests list (player, amount, timestamp, photo). Approve / reject (reject requires note). Server-enforced idempotent approvals.
  - Screens: 3.7
  - Tables: `session_injections`

---

## Phase 5: Closing & Submission

Ending active play and collecting ending stack submissions.

- [ ] **End Session action** — Treasurer/Admin action: transition to `closing` state. Block new rebuy requests after this point.
  - Screens: 3.1 (action per session.md §8)
  - Tables: `sessions`
- [ ] **Submit EndingStack screen** — Player/guest: enter ending stack value (MXN), upload required photo, submit. Supports "submit for someone else" (leaving early) with submitter tracking.
  - Screens: 3.8
  - Tables: `ending_submissions`
- [ ] **Submissions Review & Validation** — Treasurer view: per-participant list showing starting stack, approved injections total, ending stack submitted status, photo thumbnail. Actions: validate / reject (reject requires note). On validate: lock participant's ending stack.
  - Screens: 3.9
  - Tables: `ending_submissions`

---

## Phase 6: Finalization

Balance verification and session close-out.

- [ ] **Balance Check + Finalize screen** — Treasurer/Admin view: per-participant PnL table (starting stack, injections, ending stack, computed SessionPnL). Sum==0 indicator. If mismatch: finalize blocked unless override with required resolution note. Finalize button.
  - Screens: 3.10
  - Tables: `ending_submissions`, `session_injections`, `session_participants`, `session_finalize_notes`
- [ ] **Finalize action** — On finalize: set `finalized_at`/`finalized_by`, update `season_members.current_balance_mxn = ending_stack` for each member participant. Guests removed from season tracking.
  - Screens: 3.10 (action)
  - Tables: `sessions`, `season_members`
- [ ] **Session Summary screen (finalized)** — Read-only breakdown: per-participant starting → ending stack, rebuy totals, computed PnL, mismatch resolution notes (if any), updated season balances.
  - Screens: 3.11
  - Tables: `sessions`, `session_participants`, `session_injections`, `ending_submissions`, `session_finalize_notes`

---

## Phase 7: Ledger

Read-only history and audit views.

- [ ] **Ledger Home** — Season snapshot (status, treasurer, member counts). Balances table sorted by balance descending. Session history list (newest first): finalized sessions are tappable, in-progress session shows badge only.
  - Screens: 4.1
  - Tables: `seasons`, `season_members`, `sessions`
- [ ] **Session Detail (finalized)** — Read-only: header (host, timestamps, location), participant table (starting/ending/injections/PnL), rebuy timeline, ending submission photos grid, mismatch/override notes.
  - Screens: 4.1 (drill-down, per ledger.md)
  - Tables: `sessions`, `session_participants`, `session_injections`, `ending_submissions`, `session_finalize_notes`
- [ ] **Player Detail** — Per-player view: current season balance, session-by-session history table (starting → ending, rebuys, PnL), optional rebuy summary (total count, total injections).
  - Screens: 4.2
  - Tables: `season_members`, `session_participants`, `session_injections`, `ending_submissions`

---

## Phase 8: Season End

- [ ] **End Season + Payout Report** — Treasurer action: final balances table (player → payout amount), total cash sum, "End Season" confirm. On end: `status=ended`, persist `ended_at`, notify everyone, disable session creation, ledger remains read-only.
  - Screens: 2.6
  - Tables: `seasons`, `season_members`

---

## Phase 9: Notifications

- [ ] **Notification system** — In-app notification records for all v1 events: deposit submitted/approved/rejected, session scheduled/edited/started/finalized, rebuy requested/approved/rejected, submission submitted/validated/rejected, season started/ended. Mark-as-read support.
  - Tables: `notifications`

---

## Phase 10: Profile

- [ ] **Profile screen** — Show email, current season role badges (Admin/Treasurer/Member), logout action.
  - Screens: 5.1
  - Tables: `users`, `season_members`

---

## v2+ (Out of Scope — Reference Only)

These are **not** tracked as v1 work items.

- Projection HUD (read-only)
- Table ops: dealer button, pot tracking, blinds timer, hand log
- LiDAR scan to auto-count stacks (replace photo-only)
- Denomination support + chip scan improvements
- CSV export
- Automated reminders / nudges
- "Mark paid" checklist for end-of-season payouts

---

## Coverage Verification

### Screens (screens.md)

| Ref | Screen | Backlog Item |
|-----|--------|-------------|
| 1.1 | Login | Phase 0: Auth |
| 1.2 | App State Router | Phase 0: App state router |
| 2.1 | Season Home | Phase 1: Season Home |
| 2.2 | Upload Deposit Proof | Phase 1: Upload Deposit Proof |
| 2.3 | Deposit Approvals | Phase 1: Deposit Approvals |
| 2.4 | Season Setup Review + Start | Phase 1: Season Setup Review |
| 2.5 | Season Settings (Admin) | Phase 1: Create Season + Host Order |
| 2.6 | End Season + Payout | Phase 8: End Season |
| 3.1 | Session Home | Phase 2: Session Home |
| 3.2 | Schedule Next Session | Phase 2: Schedule Next Session |
| 3.3 | Edit Scheduled Session | Phase 2: Edit Scheduled Session |
| 3.4 | Start Session | Phase 3: Start Session action |
| 3.5 | Check-in & Dealing | Phase 3: Dealing Dashboard + Add Guest |
| 3.6 | Request Rebuy | Phase 4: Request Rebuy |
| 3.7 | Rebuy Approvals | Phase 4: Rebuy Approvals |
| 3.8 | End Session Submission | Phase 5: Submit EndingStack |
| 3.9 | Submissions Review | Phase 5: Submissions Review |
| 3.10 | Balance Check + Finalize | Phase 6: Balance Check + Finalize |
| 3.11 | Session Summary | Phase 6: Session Summary |
| 4.1 | Ledger Home | Phase 7: Ledger Home + Session Detail |
| 4.2 | Player Detail | Phase 7: Player Detail |
| 5.1 | Profile | Phase 10: Profile |

### Tables (datamodels.md)

| Table | Backlog Phase(s) |
|-------|-----------------|
| `users` | Backend (DB), Phase 0 (Auth), Phase 10 |
| `seasons` | Backend (DB), Phase 1, Phase 8 |
| `season_members` | Backend (DB), Phase 1, Phase 6, Phase 7, Phase 8, Phase 10 |
| `season_deposit_submissions` | Backend (DB), Phase 1 |
| `season_host_order` | Backend (DB), Phase 1 |
| `sessions` | Backend (DB), Phase 2, Phase 3, Phase 6, Phase 7 |
| `session_participants` | Backend (DB), Phase 3, Phase 4, Phase 6, Phase 7 |
| `session_injections` | Backend (DB), Phase 3 (guest buy-in), Phase 4, Phase 6, Phase 7 |
| `ending_submissions` | Backend (DB), Phase 5, Phase 6, Phase 7 |
| `session_finalize_notes` | Backend (DB), Phase 6, Phase 7 |
| `notifications` | Backend (DB), Phase 9 |
