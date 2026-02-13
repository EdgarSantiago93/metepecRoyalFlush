# SeasonFlow.md — Poker Season Ledger App (v1, Detailed)

This document specifies the v1 **Season Flow** screen-by-screen with concrete UI behavior, validations, permissions, and edge cases.

---

## Season States (v1)

- **No Season**
- **Setup**
- **Active**
- **Ended**

Only **one** season exists/active at a time.

---

## Roles (Season context)

- **Admin**
  - Can create a season
  - Can edit host order planning list
  - Can override some session actions (handled in session flow doc)
  - Does **not** have treasurer financial powers unless also assigned treasurer

- **Treasurer**
  - Approves deposits
  - Starts season
  - Ends season and generates payout report

- **Member**
  - Uploads deposit proof
  - Views season/session/ledger content (full transparency)

---

## 0) No Season Exists

### Screen: Season Home (Empty)
**Users:** Everyone  
**UI:**
- “No active season”
- Read-only description: “Waiting for a season to be created.”

**Actions:**
- **Admin only:** “Create Season”

**Rules:**
- Non-admin users cannot create seasons or configure anything.

---

## 1) Create Season → Setup

### Screen: Create Season (Admin-only)
**Required:**
- Assign **Treasurer** (dropdown from group members)

**Optional:**
- Season name (e.g., “Season Feb 2026”)

**Actions:**
- “Create Season”

**On create (system behavior):**
- Create season record with `status = setup`
- Persist `treasurerUserId`
- Initialize Host Order list with all group members
- Initialize deposit statuses for all members as “Not submitted”
- Notify everyone (optional; if enabled): “Season created (Setup)”

**Validation:**
- Treasurer must be selected

---

## 2) Setup Mode (Pre-season)

Setup is the “decide everything before arriving” phase:
- treasurer is assigned
- members submit deposit proof (even if absent from session 1)
- treasurer approves deposits
- admin defines host order list
- treasurer starts season once minimum checks pass

---

### Screen: Season Setup Home (Setup Dashboard)
**Users:** Everyone  
**UI blocks:**
1) **Season Summary**
   - Status: Setup
   - Treasurer: name
   - Approved count: X
   - Start Season button (Treasurer only)

2) **Deposit Status List (All Members)**
   - Name
   - Status badge: Not submitted / Pending / Approved / Rejected

3) **Host Order Planning Preview**
   - Current planning order (read-only to non-admin)

4) **Role-based Actions**
   - Member: “Upload deposit proof” (if not Approved)
   - Treasurer: “Review deposits”
   - Admin: “Edit host order” (and change treasurer only while Setup, if needed)

---

### Start Season Button (Setup)
**Visible to:** Treasurer only  
**Enabled only if:**
- Treasurer assigned ✅
- At least **2** members are **Approved** ✅

When disabled, show explicit reason (e.g., “Need at least 2 approved deposits”).

---

### Screen: Upload Deposit Proof
**Users:** Any allowlisted user  
**UI:**
- Photo capture/picker (required)
- Optional note
- Submit

**States:**
- Pending review (default)
- Approved
- Rejected (shows rejection note; allows re-upload)

**Rules:**
- Re-upload allowed after rejection
- History stored; latest submission is current

---

### Screen: Deposit Approvals
**Users:** Treasurer  
**UI:**
- List of all members with filters:
  - All / Pending / Approved / Rejected / Not submitted
- Member detail:
  - Latest proof photo
  - Approve
  - Reject (requires note)
  - Submission history

**On Approve (system behavior):**
- Member becomes **Approved**
- Member’s `SeasonBalance = 500 MXN`
- Member becomes eligible to participate once season becomes Active

**On Reject:**
- Member becomes **Rejected**
- Rejection requires note
- Member can re-upload proof

---

### Screen: Host Order Planning (Admin-only)
**Users:** Admin  
**UI:**
- Randomize button
- Drag & drop reorder list
- Save

**Rules:**
- Host order list includes **all group members**, regardless of paid status
- Host order is a planning tool only (actual hosting coordination remains in WhatsApp)

---

### Screen: Season Setup Review (Treasurer)
**Users:** Treasurer (primary), Admin (view)  
**Purpose:** One-page summary before starting season.

**Shows:**
- Treasurer selected
- Member list + deposit status
- Approved count
- Host order preview
- Start Season button

**Actions:**
- Treasurer: “Start Season”

---

## 3) Start Season (Setup → Active)

### Action: Start Season
**Users:** Treasurer only  
**Required checks:**
1) Treasurer assigned
2) At least **2** members Approved

**On start (system behavior):**
- Set season `status = active`
- Persist `startedAt`
- Notify everyone: “Season started”
- Enable session scheduling/starting

---

## 4) Active Season Behavior

### Screen: Season Home (Active)
**Users:** Everyone  
**Shows:**
- Status: Active
- Treasurer
- Your current SeasonBalance
- Deposit status
- Host order preview
- Link to Session Home (current scheduled/live)

**Actions:**
- Treasurer: “End Season”
- Admin: “Edit host order” (planning remains editable)
- Unapproved members: “Upload deposit proof” (late approvals)

---

### Late Approvals (Active)
**Allowed:** Yes  
**Flow:**
- Member uploads deposit proof → Treasurer approves → member becomes Approved with `SeasonBalance = 500`

**Restrictions for unapproved members:**
- Can view everything (full transparency)
- Cannot check in to sessions
- Cannot request rebuys
- Cannot be dealt chips (not eligible for session participation)

---

### Treasurer Lock (Active)
**Decision (v1):** Treasurer is **locked** once season becomes Active.  
**Rule:**
- Treasurer cannot be changed while season is Active
- Treasurer can only change next season (during Setup)

---

## 5) End Season (Active → Ended)

### Screen: End Season → Payout Report
**Users:** Treasurer (Admin view)  
**Purpose:** Generate payout instructions for the treasurer to distribute physical cash.

**Payout rule:**
- Payout per player = final `SeasonBalance` (MXN)
- Balances are non-negative

**Shows:**
- Table: player → payout amount
- Total payout sum (must match treasurer physical cash)

**Actions:**
- “End Season” confirm

**On end (system behavior):**
- Set season `status = ended`
- Persist `endedAt`
- Notify everyone: “Season ended”
- Session creation disabled
- Ledger remains available (read-only history)

---

## Notifications (v1)

- Deposit proof submitted → Treasurer notified
- Deposit approved/rejected → Member notified
- Season started → Everyone notified
- Season ended → Everyone notified

No reminders.

---
