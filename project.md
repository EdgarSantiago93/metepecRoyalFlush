# project.md — Poker Season Ledger App (v1)

## Overview

A private mobile app for a single poker group that replaces the Excel ledger and WhatsApp deposit-proof flow.

The app tracks **season-based balances** that carry across sessions, handles **treasurer approvals** (deposits + rebuys), requires **photo proof** for end-of-session chip counts, and enforces **ledger integrity** via balancing checks and audit notes.

This is **not** a multi-tenant product. It’s for a finite list of known users (pre-populated allowlist).
  
---
    
## Goals

- Replace Excel with a reliable, auditable ledger.
- Track per-player balances across a season (persistent bankroll model).
- Make money movements explicit:
  - Season deposits
  - Approved rebuys / half rebuys
  - End-of-session chip count checkpoints
- Prevent / detect miscounts automatically (session balancing).
- Support “guest” players for one session.
- Produce end-of-season payout instructions for the treasurer.

---

## Non-goals (v1)

- Projection HUD
- Dealer button, pot tracking, blinds timer, hand history
- Card recognition / camera AR
- Chip denomination breakdown
- CSV export
- Automated reminders / nudges

---

## Key Concepts & Roles

### Group model
- Single private group.
- Users are allowlisted by email (pre-populated).

### Roles
- **Admin**
  - Can create seasons.
  - Can configure season planning order (host order list).
  - Can override session creation/start/finalize as a backup.
  - No special treasurer permissions unless also assigned as treasurer.

- **Treasurer**
  - Holds the season money physically.
  - Approves season deposits.
  - Approves rebuys / half rebuys.
  - Validates end-of-session submissions (EndingStack + required photo).
  - Can finalize sessions (with balancing constraints and notes).
  - Can start/end season.

- **Player**
  - Logs in (allowlisted email).
  - Can join/check-in to sessions.
  - Confirms starting stack (total value).
  - Requests rebuys / half rebuys.
  - Submits EndingStack + required photo.
  - Can submit on behalf of someone who left early (allowed).

- **Guest**
  - Exists for a single session only (on-ledger option).
  - Added manually by treasurer.
  - If guest has an account: read-only banner, but can submit EndingStack + photo.
  - If guest has no account: one-time guest profile.

---

## Authentication (v1)

- Email login (passwordless/magic link acceptable).
- Only allowlisted emails can access the app.

---

## Season Model

### Season lifecycle
- Only one active season at a time.
- Season starts in **Setup** mode.
- Treasurer presses **Start Season** after review checks.
- Season ends when treasurer decides (or after the hosting loop completes outside the app).

### Season setup requirements
- Admin creates the season.
- Admin assigns the Treasurer for that season.
- UI shows all group members and deposit status.

### Deposit approval
- Each member uploads proof of deposit photo (500 MXN).
- Treasurer is notified and approves.
- Approved members become active participants and receive:
  - Starting balance = **500 MXN**.

### Start Season (explicit)
- Season does not become Active until treasurer presses **Start Season**.
- Start Season checks:
  - Treasurer assigned
  - At least **2** members approved/paid

### Late approvals
- Allowed after season is active:
  - Members can upload proof later and get approved.
- Unapproved members cannot check in or participate on-ledger.

---

## Host Order Planning (Season)

- Host order is a **planning tool** only (WhatsApp decides actual hosting).
- Includes **all group members** regardless of paid status.
- Admin can:
  - Randomize order initially.
  - Edit order via drag-and-drop any time.

---

## Sessions Model

### Key principles
- Sessions are **ad hoc** events and can occur weekly or with long gaps.
- The app does **not** auto-nag or auto-create sessions.

### Session scheduling (pre-session)
- Treasurer (or Admin) schedules the next session by selecting:
  - Host (from host order list)
  - Date/time (optional but supported)
  - Location (text)
- Scheduling notifies **everyone** in the group (even unpaid/unapproved).

### Editing scheduled sessions
- Treasurer or Admin can edit:
  - Host
  - Date/time
  - Location
- Any edit notifies **everyone**.

### No reminders (v1)
- No reminder notifications.

### No cancel (v1)
- No cancel action; edits cover changes.

---

## Session States (v1)

1. **Scheduled**
2. **Setup / Dealing**
3. **In Progress**
4. **Closing / Submission**
5. **Finalized**

Only Treasurer/Admin can:
- Start Session
- Finalize Session

---

## Session Participation

### Check-in (self-service)
- Players self check-in with a button (“Check in” / “Join session”).
- Treasurer can remove/kick a player from the session.

### Starting stacks (persistent bankroll)
- Each season member’s **StartingStack** for a session is auto-derived:
  - Season start: 500 (after deposit approval)
  - Otherwise: the member’s last on-ledger **EndingStack**
- Guest StartingStack defaults to 0.

### Setup/Dealing confirmations
- Treasurer deals chips physically based on StartingStack.
- Each checked-in player must confirm they received correct chips:
  - Confirmation is **total value only** (no denomination breakdown).
- Session can only move to **In Progress** when **all checked-in players confirmed**.

---

## Rebuys

### Types (fixed)
- Rebuy: **500 MXN**
- Half rebuy: **250 MXN**
- Unlimited

### Flow
- Player requests rebuy/half rebuy.
- Treasurer approves once money is received and chips are delivered.
- Optional: player can attach a proof photo for the rebuy (not required).

---

## End of Session: Submission & Validation

### Required per checked-in participant
- EndingStack value (MXN)
- Photo proof (required)

### Leaving early
- A participant may leave early, but the session must still capture an EndingStack.
- Remaining players can submit on their behalf.
- Treasurer validates as normal.

### Validation
- Treasurer reviews all submissions and validates each.

---

## Ledger Math & Integrity

### Per-participant computed metric
SessionPnL is computed as:

- `SessionPnL = EndingStack - StartingStack - Sum(ApprovedInjections)`

ApprovedInjections include:
- Approved rebuys (500/250)
- Guest initial buy-in (500)

### Balancing invariant (must enforce)
- `Sum(SessionPnL for all participants in the session) == 0`
- Includes on-ledger guests.

### Mismatch handling
- If session does not balance:
  - Finalization is blocked
  - Treasurer can override finalization ONLY if they enter a required **note**
    explaining what happened and how it was resolved.

### No negative balances
- Player balances cannot go negative.
- If a player reaches 0, they must stop playing or rebuy to continue.

---

## Guests

### Modes
- **Friendly / off-ledger**: Not tracked (excluded from all season/session math).
- **On-ledger guest**: Included in session math for that session only.

### On-ledger guest rules
- Treasurer adds guest manually.
- When added, the app auto-creates required **Initial Buy-in 500** (pending approval).
- Guest rebuys:
  - If guest has app: can request rebuys like a player.
  - If no app: treasurer creates/approves rebuys on their behalf.
- Guest can submit EndingStack + photo (if they have app), treasurer validates.
- Guest is removed after session finalization (no season persistence).

---

## End of Season Settlement

### Payout rule
- Each player’s payout = their final **Season Balance** (MXN), which is the current stack value.

### Treasurer payout report
- App outputs a report listing:
  - Player → payout amount
- The sum of payouts must equal the total physical cash held by treasurer for that season.

---

## Permissions Summary (v1)

- Admin:
  - Create season
  - Manage host order list
  - Override session creation/start/finalize (backup)

- Treasurer:
  - Approve deposits
  - Start season
  - Schedule/edit sessions
  - Create/start sessions
  - Approve rebuys
  - Validate submissions
  - Finalize sessions (with balancing enforcement + notes)
  - End season and generate payout report

- Players:
  - Check in to session
  - Confirm starting stack (total value)
  - Request rebuys
  - Submit EndingStack + required photo
  - View everything (full transparency)

- Guests (with app):
  - Read-only with Guest banner
  - Can submit EndingStack + required photo
  - Can request rebuys (if allowed; default allowed)

---

## Notifications (v1)

- Deposit proof submitted → treasurer notified
- Deposit approved → member notified
- Session scheduled → everyone notified
- Session edited → everyone notified
- Rebuy requested → treasurer notified
- Rebuy approved → requester notified
- EndingStack submitted → treasurer notified
- Submission validated → participant notified
- Season started / ended → everyone notified

No reminders.

---

## v2+ Ideas (not in scope)

- Projection HUD (read-only)
- Table ops: dealer button / pot / blinds timer / hand log
- LiDAR scan to auto-count stacks (replace photo-only)
- Denomination support + chip scan improvements
- CSV export
