# Screens.md — Poker Season Ledger App (v1) Screens

This document describes the v1 screen map (mobile-first) for the Poker Season Ledger App.

---

## Global Navigation (v1)

Suggested bottom tabs:
1) **Season**
2) **Session**
3) **Ledger**
4) **Profile**

Admin/Treasurer see extra actions inside screens (not extra tabs).

---

## 1) Auth & Bootstrap

### 1.1 Login
**Users:** Everyone  
**Purpose:** Allowlisted email login (passwordless/magic link)  
**UI:**
- Email field
- “Send login link”
- Error: “Email not allowed”

### 1.2 App State Router (Bootstrap)
**Users:** Everyone  
**Purpose:** Route user to correct screen based on app state:
- No season exists → Admin sees “Create Season”
- Season in Setup → Season Setup screens
- Season Active with scheduled session → Session Home (Scheduled state)
- Season Active with live session → Session flow screens

---

## 2) Season Screens

### 2.1 Season Home
**Users:** Everyone  
**Shows:**
- Season status: Setup / Active / Ended
- Treasurer name
- “My season balance” (current stack value)
- Deposit status (Approved / Pending)
- Host order preview (read-only)

**Actions (role-based):**
- Player: Upload deposit proof (if needed)
- Treasurer: Review deposits
- Admin: Season settings / Host order
- Treasurer: Start season (if Setup + checks pass)
- Treasurer: End season (if Active)

---

### 2.2 Upload Deposit Proof
**Users:** Players  
**Purpose:** Submit season deposit proof photo (500 MXN)  
**UI:**
- Photo picker/camera
- Optional note
- Submit

**States:**
- Pending review
- Approved

---

### 2.3 Deposit Approvals
**Users:** Treasurer  
**Purpose:** Review/approve deposit proofs  
**UI:**
- List of members:
  - Name
  - Deposit status
- Member detail:
  - Proof photo
  - Approve / Reject (reject requires note)
  - History (if re-uploaded)

---

### 2.4 Season Setup Review + Start Season
**Users:** Treasurer (primary), Admin (view)  
**Purpose:** Review season setup summary and start season  
**Shows:**
- Treasurer selected
- Paid/approved count (must be ≥ 2)
- List of members + paid status
- Host order preview
- “Start Season” button (enabled only if checks pass)

---

### 2.5 Season Settings (Admin-only)
**Users:** Admin  
**Purpose:** Configure season (planning + roles)  
**Sections:**
- Assign Treasurer (dropdown)
- Host Order Planning:
  - Randomize button
  - Drag & drop reorder
  - Save
- (Optional) Season name

---

### 2.6 End Season → Payout Report
**Users:** Treasurer (and Admin view)  
**Purpose:** End season and generate payout report  
**Shows:**
- Final balances (payout = balance)
- Total cash required (sum of balances)
- Optional “Mark paid” checklist per player (v1.1+)
- Confirm “End Season”

---

## 3) Session Screens

### 3.1 Session Home (Stateful Hub)
**Users:** Everyone  
**Purpose:** Show current session state and next actions  
**Supported states:**
- No scheduled session → “Waiting for next session”
- Scheduled (host/date/location) → details view
- Setup/Dealing → confirmation progress
- In Progress → rebuys feed and actions
- Closing/Submission → submission progress
- Finalized → session summary + balances updated

**Actions (role-based):**
- Player: Check-in / Confirm received / Request rebuy / Submit ending stack
- Treasurer/Admin: Schedule next session / Edit schedule / Start session / Validate submissions / Finalize session

---

### 3.2 Schedule Next Session
**Users:** Treasurer/Admin  
**Purpose:** Create a scheduled session and notify everyone  
**Flow/UI:**
- Select host (tap from Host Order list)
- Set date/time (optional)
- Set location (optional)
- Save → notify everyone

---

### 3.3 Edit Scheduled Session
**Users:** Treasurer/Admin  
**Purpose:** Modify scheduled session details  
**UI:** Same as Schedule, prefilled  
**Behavior:** Save → notify everyone

---

### 3.4 Start Session (Confirm)
**Users:** Treasurer/Admin  
**Purpose:** Start the live session and record start timestamp  
**UI:**
- “Start Session now?” confirmation
- On confirm → state becomes Setup/Dealing

---

### 3.5 Check-in & Dealing Dashboard (Setup/Dealing)
**Users:** Everyone (role-based actions)  
**Purpose:** Manage check-in and starting stack confirmations

**Player view:**
- “Check in”
- After check-in: “You should receive $X” + buttons:
  - Confirm received
  - Dispute / incorrect

**Treasurer/Admin view:**
- Live list:
  - Checked-in? ✅
  - Confirmed received? ✅
  - StartingStack value
- “Move to In Progress” disabled until all checked-in confirmed
- Kick/remove player (if needed)

---

### 3.6 Request Rebuy
**Users:** Players (and guests with app)  
**Purpose:** Request rebuy/half rebuy for treasurer approval  
**UI:**
- Buttons:
  - +500
  - +250
- Optional proof photo upload
- Submit → pending treasurer approval

---

### 3.7 Rebuy Approvals
**Users:** Treasurer  
**Purpose:** Approve rebuy requests  
**UI:**
- List of pending requests:
  - Player
  - Amount
  - Timestamp
- Approve / Reject (reject requires note)

---

### 3.8 End Session Submission (Player)
**Users:** Players/Guests  
**Purpose:** Submit EndingStack and required photo proof  
**UI:**
- Enter EndingStack value (MXN)
- Upload photo (required)
- Submit

---

### 3.9 Submissions Review & Validation
**Users:** Treasurer  
**Purpose:** Validate each participant’s ending submission  
**UI:**
- List:
  - Player
  - StartingStack
  - Approved injections total
  - EndingStack submitted? + photo thumbnail
- Actions per player:
  - Validate
  - Reject (requires note)

---

### 3.10 Balance Check + Finalize
**Users:** Treasurer/Admin  
**Purpose:** Ensure session balances and finalize  
**Shows:**
- Per-player computed SessionPnL
- “Sum PnL == 0” indicator
- If mismatch:
  - Finalize blocked
  - Override path: required “Resolution note”
- Finalize button

---

### 3.11 Session Summary (Finalized)
**Users:** Everyone  
**Purpose:** Review finalized session results  
**Shows:**
- StartingStack → EndingStack per player
- Rebuy totals
- Computed PnL per player
- Mismatch resolution notes (if any)
- Updated season balances

---

## 4) Ledger Screens (Season History)

### 4.1 Ledger Home
**Users:** Everyone  
**Purpose:** Season balances + session history  
**Shows:**
- Current season balances list
- Sessions list (chronological)
- Tap session → Session Summary

---

### 4.2 Player Detail (Optional v1)
**Users:** Everyone  
**Purpose:** Per-player history  
**Shows:**
- Session-by-session balance history (stack over time)
- Rebuy history

---

## 5) Profile

### 5.1 Profile
**Users:** Everyone  
**Purpose:** Account info + role visibility  
**Shows:**
- Email
- Current season role badges (Admin/Treasurer/Member)
- Logout
