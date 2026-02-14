# DataModel.md — Poker Season Ledger App (v1)

This document defines the v1 data model (SQLite/Turso-friendly).  
**IDs are ULIDs stored as TEXT.**  
**Money is stored as INTEGER (MXN whole pesos).**

---

## 1) Users & Access

### `users`
Allowlisted identities for email login.

**Fields**
- `id` (TEXT, PK) — ULID
- `email` (TEXT, UNIQUE, NOT NULL) — normalized lowercase
- `display_name` (TEXT, NOT NULL)
- `is_admin` (INTEGER, NOT NULL, default 0) — 0/1
- `created_at` (TEXT, NOT NULL) — ISO datetime

**Notes**
- Database is pre-populated with the group’s emails.

---

## 2) Seasons

### `seasons`
Only one active/setup season at a time.

**Fields**
- `id` (TEXT, PK) — ULID
- `name` (TEXT, nullable)
- `status` (TEXT, NOT NULL) — `setup | active | ended`
- `created_by_user_id` (TEXT, NOT NULL, FK → users.id)
- `treasurer_user_id` (TEXT, NOT NULL, FK → users.id)
- `created_at` (TEXT, NOT NULL)
- `started_at` (TEXT, nullable)
- `ended_at` (TEXT, nullable)

**Rules**
- Treasurer is **locked** once `status = active`.
- Enforce “one non-ended season” in service logic (SQLite uniqueness constraints are limited here).

---

### `season_members`
Per-season approval status + persistent balance.

**Fields**
- `id` (TEXT, PK) — ULID
- `season_id` (TEXT, NOT NULL, FK → seasons.id)
- `user_id` (TEXT, NOT NULL, FK → users.id)
- `approval_status` (TEXT, NOT NULL) — `not_submitted | pending | approved | rejected`
- `current_balance_mxn` (INTEGER, NOT NULL, default 0)
- `approved_at` (TEXT, nullable)
- `approved_by_user_id` (TEXT, nullable, FK → users.id)
- `rejection_note` (TEXT, nullable)
- `created_at` (TEXT, NOT NULL)

**Constraints**
- UNIQUE `(season_id, user_id)`

**Rules**
- Only `approved` members can check in / request rebuys / be dealt chips.
- On approval, set `current_balance_mxn = 500`.

---

### `season_deposit_submissions`
History of deposit proof photos per user per season.

**Fields**
- `id` (TEXT, PK) — ULID
- `season_id` (TEXT, NOT NULL, FK → seasons.id)
- `user_id` (TEXT, NOT NULL, FK → users.id)
- `photo_url` (TEXT, NOT NULL)
- `note` (TEXT, nullable)
- `status` (TEXT, NOT NULL) — `pending | approved | rejected`
- `reviewed_at` (TEXT, nullable)
- `reviewed_by_user_id` (TEXT, nullable, FK → users.id)
- `review_note` (TEXT, nullable)
- `created_at` (TEXT, NOT NULL)

**Rules**
- Users can re-upload after rejection; keep history.
- Treasurer approves submissions; approval should update `season_members`.

---

### `season_host_order`
Planning-only host order list (includes all group members regardless of paid status).

**Fields**
- `id` (TEXT, PK) — ULID
- `season_id` (TEXT, NOT NULL, FK → seasons.id)
- `user_id` (TEXT, NOT NULL, FK → users.id)
- `sort_index` (INTEGER, NOT NULL)
- `updated_at` (TEXT, NOT NULL)

**Constraints**
- UNIQUE `(season_id, user_id)`
- (Optional) UNIQUE `(season_id, sort_index)` for stable ordering.

---

## 3) Sessions

### `sessions`
Represents a single game night within a season.

**State**
- `scheduled | dealing | in_progress | closing | finalized`

**Fields**
- `id` (TEXT, PK) — ULID
- `season_id` (TEXT, NOT NULL, FK → seasons.id)
- `state` (TEXT, NOT NULL)
- `host_user_id` (TEXT, NOT NULL, FK → users.id)

**Scheduling**
- `scheduled_for` (TEXT, nullable) — planned date/time
- `location` (TEXT, nullable)
- `scheduled_at` (TEXT, NOT NULL)
- `scheduled_by_user_id` (TEXT, NOT NULL, FK → users.id)

**Lifecycle timestamps**
- `started_at` (TEXT, nullable)
- `started_by_user_id` (TEXT, nullable, FK → users.id)
- `ended_at` (TEXT, nullable) — when “End Session” pressed
- `ended_by_user_id` (TEXT, nullable, FK → users.id)
- `finalized_at` (TEXT, nullable)
- `finalized_by_user_id` (TEXT, nullable, FK → users.id)

**Rules**
- Only Treasurer/Admin can change state.
- Enforce “one non-finalized session at a time” per season in service logic.

---

### `session_participants`
Roster for a session: members + guests.

**Types**
- `member` — approved season member
- `guest_user` — existing app user but guest for this session
- `guest_ephemeral` — no account, name only

**Fields**
- `id` (TEXT, PK) — ULID
- `session_id` (TEXT, NOT NULL, FK → sessions.id)
- `type` (TEXT, NOT NULL)
- `user_id` (TEXT, nullable, FK → users.id) — member/guest_user
- `guest_name` (TEXT, nullable) — guest_ephemeral
- `starting_stack_mxn` (INTEGER, NOT NULL)

**Check-in / confirmation**
- `checked_in_at` (TEXT, nullable)
- `confirmed_start_at` (TEXT, nullable)
- `start_dispute_note` (TEXT, nullable)

**Removal**
- `removed_at` (TEXT, nullable)
- `removed_by_user_id` (TEXT, nullable, FK → users.id)

**Meta**
- `created_at` (TEXT, NOT NULL)

**Rules**
- Starting stacks are **total value only** (no denomination breakdown).
- “Move to In Progress” requires all checked-in, non-removed participants to have `confirmed_start_at`.

---

### `session_injections`
All cash injections during a session: rebuys + guest buy-in.

**Types**
- `rebuy_500`
- `half_250`
- `guest_buyin_500`

**Fields**
- `id` (TEXT, PK) — ULID
- `session_id` (TEXT, NOT NULL, FK → sessions.id)
- `participant_id` (TEXT, NOT NULL, FK → session_participants.id)
- `type` (TEXT, NOT NULL)
- `amount_mxn` (INTEGER, NOT NULL) — 500/250/500

**Request**
- `requested_by_user_id` (TEXT, nullable, FK → users.id)
- `requested_at` (TEXT, NOT NULL)
- `proof_photo_url` (TEXT, nullable)

**Approval**
- `status` (TEXT, NOT NULL) — `pending | approved | rejected`
- `reviewed_at` (TEXT, nullable)
- `reviewed_by_user_id` (TEXT, nullable, FK → users.id)
- `review_note` (TEXT, nullable)

**Meta**
- `created_at` (TEXT, NOT NULL)

**Rules**
- Only `approved` injections count in totals.
- After session moves to `closing`, block new pending requests (recommended v1).
- Server must enforce idempotent approvals (can’t approve twice).

---

### `ending_submissions`
EndingStack + required photo proof.

**Fields**
- `id` (TEXT, PK) — ULID
- `session_id` (TEXT, NOT NULL, FK → sessions.id)
- `participant_id` (TEXT, NOT NULL, FK → session_participants.id)
- `ending_stack_mxn` (INTEGER, NOT NULL)
- `photo_url` (TEXT, NOT NULL)
- `submitted_at` (TEXT, NOT NULL)
- `submitted_by_user_id` (TEXT, nullable, FK → users.id) — allows “submit for someone else”
- `note` (TEXT, nullable)

**Validation**
- `status` (TEXT, NOT NULL) — `pending | validated | rejected`
- `reviewed_at` (TEXT, nullable)
- `reviewed_by_user_id` (TEXT, nullable, FK → users.id)
- `review_note` (TEXT, nullable)

**Meta**
- `created_at` (TEXT, NOT NULL)

**Rules**
- Finalize requires every non-removed participant to have a `validated` submission.
- You can support resubmits by inserting a new row and treating the latest as active (or update in place).

---

### `session_finalize_notes`
Only present when treasurer overrides finalization due to balancing mismatch.

**Fields**
- `id` (TEXT, PK) — ULID
- `session_id` (TEXT, NOT NULL, UNIQUE, FK → sessions.id)
- `note` (TEXT, NOT NULL)
- `created_by_user_id` (TEXT, NOT NULL, FK → users.id)
- `created_at` (TEXT, NOT NULL)

---

## 4) Notifications (Optional but recommended)

### `notifications`
Audit trail of in-app/push notifications.

**Fields**
- `id` (TEXT, PK) — ULID
- `user_id` (TEXT, NOT NULL, FK → users.id)
- `type` (TEXT, NOT NULL)
- `payload_json` (TEXT, NOT NULL)
- `created_at` (TEXT, NOT NULL)
- `read_at` (TEXT, nullable)

---

## 5) Derived Computations (Not stored)

### Approved injection total
`approved_injections_total = SUM(session_injections.amount_mxn WHERE status='approved')`

### SessionPnL (per participant)
`SessionPnL = ending_stack_mxn - starting_stack_mxn - approved_injections_total`

### Session balancing constraint
`SUM(SessionPnL across all non-removed participants) == 0`  
If mismatch, require `session_finalize_notes.note` for override finalization.

### Season balance update on session finalize
For each **member** participant:
`season_members.current_balance_mxn = ending_stack_mxn`

Guests do not persist into season balance.

---
