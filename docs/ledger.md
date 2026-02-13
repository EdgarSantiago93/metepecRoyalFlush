# LedgerScreens.md — Poker Season Ledger App (v1)

Ledger is the read-only “truth view” of the season: current balances, session history, and finalized session details.
Transparency is full: all members can view all session details and photos for finalized sessions.

---

## Ledger Rules (v1)

1) Ledger shows:
- All **Finalized** sessions (clickable)
- The **current session** as a single row with an **“In Progress”** badge
  - No drill-down / no details for in-progress sessions

2) No export (v1).

3) Full transparency:
- Everyone can view:
  - balances
  - rebuys
  - ending submissions + photos
  - validation outcomes
  - mismatch notes (if override used)

---

## Screen: Ledger Home

**Users:** Everyone  
**Purpose:** Replace the Excel “single source of truth” view.

### Sections

#### A) Season Snapshot (top)
- Season status: Active / Setup / Ended
- Treasurer name
- Optional KPIs:
  - Approved members count
  - Total members count

#### B) Balances Table (primary)
A sortable list (default: descending balance):
- Member name
- Current SeasonBalance (MXN)

Optional badges:
- “Unapproved” (if season active but member not yet approved; balance not applicable or hidden)

#### C) Session History List
List newest first.

**For the current active session (if any):**
- Row shows:
  - Host name
  - “In Progress” badge
  - Started timestamp (optional)
- Tap does nothing (or opens a simple toast: “Details available after finalization”)

**For each finalized session row:**
- Host name
- Date/time (start or finalize time, whichever you prefer)
- “Finalized” badge
- Tap → Session Detail (Finalized)

---

## Screen: Session Detail (Finalized)

**Users:** Everyone  
**Purpose:** Read-only finalized session breakdown.

### Header
- Host
- StartedAt, FinalizedAt
- Optional location (if scheduled)
- Status: Finalized

### Participant Table
Per participant:
- Name
- Type: Member / Guest
- StartingStack (MXN)
- Approved injections total (MXN)
- EndingStack (MXN)
- Computed SessionPnL (MXN)

### Rebuy Timeline
Chronological feed:
- Who requested
- Amount (500/250)
- Approved by (treasurer)
- Timestamp
- Optional proof photo (if uploaded)

### Ending Submissions (Photos)
Grid/list:
- Participant name
- EndingStack value
- Photo thumbnail (tap to expand)
- Validation status
- Rejection notes (if any)

### Mismatch / Override Notes
If session was finalized with override:
- Show the treasurer’s required resolution note
- Show “SumPnL mismatch at finalize” indicator

---

## Screen: Player Detail (Recommended v1)

**Users:** Everyone  
**Purpose:** Quick per-player view replacing Excel per-person calculations.

### Header
- Player name
- Current SeasonBalance

### History Table (Finalized sessions only)
For each finalized session:
- Host (or date)
- StartingStack → EndingStack
- Rebuys total
- SessionPnL

### Optional: Rebuy Summary
- Total rebuys count
- Total injections this season

---

## UX Notes (v1)

- Ledger is always accessible, but:
  - In-progress session details are hidden until finalized (only badge row is shown).
- Sorting balances is useful for “who’s up/down” at a glance.
- Session Detail is the “audit record” with photos and approvals.

---
