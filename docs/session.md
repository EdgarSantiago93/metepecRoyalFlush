# SessionFlow.md — Poker Season Ledger App (v1)

This document specifies the complete v1 **Session Flow**: states, screens, permissions, validations, edge cases, and notifications.

---

## Session State Machine (v1)

A session belongs to an **Active Season** and progresses through:

1. **Scheduled**
2. **Setup / Dealing**
3. **In Progress**
4. **Closing / Submission**
5. **Finalized**

**Who can change states:** Treasurer or Admin only.

---

## 0) No Scheduled Session

### Screen: Session Home (No Scheduled Session)
**Users:** Everyone  
**UI:**
- “No session scheduled”
- Current treasurer
- Your current season balance
- Optional: host order preview (read-only)

**Actions:**
- Treasurer/Admin: **Schedule Next Session**

**Rules:**
- Cannot schedule if no Active season exists
- Unapproved members can view, but cannot later participate on-ledger

---

## 1) Schedule → Scheduled State

### Screen: Schedule Next Session
**Users:** Treasurer/Admin  
**Required input:**
- Host (pick from Host Order list)

**Optional inputs:**
- Date/time
- Location (free text)

**Actions:**
- Save → creates session in **Scheduled**
- Edit later (same form)

**System behavior on Save:**
- Store: `scheduledAt`, `scheduledBy`, `hostUserId`, `scheduledFor?`, `location?`
- Send notification to everyone in the group

**Validations:**
- Host is required
- Enforce **one current scheduled/live session** at a time (simplifies v1)

---

### Screen: Session Home (Scheduled)
**Users:** Everyone  
**UI:**
- Host (highlighted)
- Date/time + location (if set)
- Status: “Scheduled / Waiting to start”

**Actions:**
- Treasurer/Admin: **Start Session**
- Treasurer/Admin: **Edit Schedule**

**Edit behavior:**
- Any edit triggers a notification to everyone

---

## 2) Start Session → Setup/Dealing

### Action: Start Session
**Users:** Treasurer/Admin  
**Behavior:**
- Set `startedAt = now`
- Transition to **Setup / Dealing**
- Scheduled fields become read-only historical context (still visible)

---

## 3) Setup / Dealing (Check-in + StartingStack Confirmation)

### Screen: Setup / Dealing Dashboard
**Users:** Everyone (role-based actions)  
**Purpose:** Build roster, assign StartingStacks, and collect confirmations.

---

### 3.1 Player UX (Setup/Dealing)
**Actions:**
- **Check in**
- After check-in:
  - Display: “You should receive **$X MXN**”
  - Buttons:
    - ✅ Confirm received
    - ❌ Dispute (requires note)

**Eligibility to check in:**
- Only **approved/paid** season members
- Guests cannot self-check-in (added by treasurer)

---

### 3.2 Treasurer/Admin UX (Setup/Dealing)
**Roster list columns:**
- Name
- Type: Member / Guest
- StartingStack
- Checked-in? ✅/❌
- Confirmed received? ✅/❌

**Actions:**
- Kick/remove participant
- Add guest
- (Optional v1) Edit StartingStack in case of dispute resolution

**Primary action:**
- “Move to In Progress” button is **disabled** until:
  - At least 2 checked-in participants (recommended)
  - All checked-in participants have confirmed their StartingStack
  - Any disputes resolved or overridden

---

### 3.3 StartingStack Rules
When a participant checks in:

**Season member:**
- `StartingStack = last finalized EndingStack` in this season
- If first session of season: `StartingStack = 500` (only after deposit approval)

**Guest:**
- `StartingStack = 0`

Total-value only (no denominations in v1).

---

### 3.4 Disputes
If a player disputes:
- Require note: e.g., “I received 450 not 500”
- Treasurer resolves by:
  - Re-dealing and having player reconfirm, OR
  - Editing StartingStack for that session (rare; allowed)

---

## 4) Add Guest (Setup/Dealing or In Progress)

### Screen/Modal: Add Guest
**Users:** Treasurer (Admin optional as override)  
**Options:**
- Select existing user (guest has app)
- Create one-time guest profile (name only)

**On save:**
- Add guest to session roster
- Auto-create **Initial Buy-in 500** (pending approval)
- Guest appears in roster (recommended: auto-check-in guest)

**Guest permissions:**
- If guest has app: read-only banner + can submit EndingStack + required photo
- Rebuys:
  - If guest has app: guest can request rebuys like a player
  - If no app: treasurer creates rebuys on their behalf

---

## 5) Setup/Dealing → In Progress

### Action: Move to In Progress
**Users:** Treasurer/Admin  
**Requirements:**
- All checked-in participants have confirmed StartingStack
- Disputes resolved (or overridden)

**Behavior:**
- Transition to **In Progress**

---

## 6) In Progress (Live Play)

### Screen: Session Home (In Progress)
**Users:** Everyone  
**UI sections:**
- Participants list + running approved injections totals per player
- Rebuy feed (timeline)
- Player action: **Request Rebuy**
- Treasurer action: **Approve Rebuys**
- Treasurer/Admin action: **End Session** (moves to Closing/Submission)

---

## 7) Rebuys (Request + Approval)

### Screen: Request Rebuy
**Users:** Players (and guests with app)  
**UI:**
- Buttons:
  - +500
  - +250
- Optional proof photo upload
- Submit

**Rule:**
- Rebuy does not affect ledger until treasurer approval.

---

### Screen: Rebuy Approvals
**Users:** Treasurer  
**UI:**
- Pending requests list: player, amount, timestamp, optional photo
- Approve / Reject (reject requires note)

**On approve:**
- Create injection record: `approvedAt`, `approvedBy`
- Update UI totals in real time

**Concurrency rule:**
- Injection request can be approved once (server idempotency)

---

## 8) End Session → Closing / Submission

### Action: End Session
**Users:** Treasurer/Admin  
**Behavior:**
- Transition to **Closing / Submission**
- Recommendation (v1): block new rebuy requests after this point

---

## 9) Closing / Submission (EndingStack + Photo)

### Screen: Closing / Submission Dashboard
**Users:** Everyone  
**UI:**
- Participant list with statuses:
  - EndingStack submitted? ✅/❌
  - Photo uploaded? ✅/❌
  - Validated? ✅/❌
- Player action: **Submit EndingStack**

---

### Screen: Submit EndingStack
**Users:** Players / Guests with app  
**Required:**
- EndingStack value (MXN)
- Photo proof (required)

**Submit for someone else (leaving early):**
- Allowed (any participant can submit on behalf of another)
- Record “submittedBy” and optional note

---

## 10) Validation

### Screen: Submissions Review & Validation
**Users:** Treasurer  
**Per participant:**
- View photo
- Validate / Reject (reject requires note)

**On validate:**
- Lock that participant’s EndingStack

---

## 11) Balance Check + Finalize

### Screen: Balance Check + Finalize
**Users:** Treasurer/Admin  
**Shows:**
- Table per participant:
  - StartingStack
  - Approved injections total
  - EndingStack
  - Computed SessionPnL

**Computation:**
- `SessionPnL = EndingStack - StartingStack - Sum(ApprovedInjections)`

**Balancing requirement:**
- `Sum(SessionPnL across all participants) == 0` (includes on-ledger guests)

**Finalize rules:**
- Must have all submissions validated
- Must balance OR treasurer override

**Override:**
- Requires resolution note explaining mismatch and outcome

---

## 12) Finalize Session

### Action: Finalize
**Users:** Treasurer/Admin  
**Behavior:**
- Set `finalizedAt`, `finalizedBy`
- Update season balances:
  - For each season member: `SeasonBalance = EndingStack`
- Guests do not carry forward to season; session-only.

---

## 13) Session Summary (Finalized)

### Screen: Session Summary
**Users:** Everyone  
**Shows:**
- StartingStack → EndingStack per notifications
- Rebuy totals and approvals
- Computed PnL per participant
- Mismatch resolution note (if any)
- Updated season balances

---

## Edge Cases (v1)

1) Player checks in then is removed before In Progress
- Remove participant; no end submission required.

2) Player leaves early mid-session
- Must still have EndingStack recorded (others may submit).

3) Multiple approvals attempted for same rebuy
- Server enforces single approval.

4) Rebuys after End Session pressed
- Block new requests (recommended v1).

---

## Notifications (v1)

- Session scheduled → everyone
- Session edited → everyone
- Rebuy requested → treasurer
- Rebuy approved/rejected → requester
- EndingStack submitted → treasurer
- Submission validated/rejected → participant
- Session finalized → everyone

No reminders.

---
