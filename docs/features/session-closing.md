# Session Closing (Phase 5)

## Purpose

When the treasurer taps "End Session", the session transitions from `in_progress` to `closing`. During this phase, players submit their ending chip count with a required proof photo, and the treasurer validates or rejects each submission.

Finalization (balance check + finalize action) is handled in Phase 6.

## Session Flow

```
in_progress → (treasurer taps "End Session") → closing
```

In the closing state:
- No more rebuys can be requested
- Players submit ending stacks with required photo proof
- Treasurer validates or rejects submissions
- Rejected players can resubmit

## Components

### `session-closing.tsx`
Main layout component. Renders:
- Amber/orange banner with "Session Closing" title, host info, and "X of Y validated" badge
- `<ClosingPlayerView />` — player's personal view
- `<SubmissionReview />` — treasurer-only pending submissions review
- `<ClosingRoster />` — participant table with submission statuses

Pull-to-refresh calls `refreshEndingSubmissions()` + `refreshParticipants()`.

### `closing-player-view.tsx`
Player's personal view with 4 UI states based on latest submission:

1. **No submission** — Stats card + submission form (numeric input, required photo, optional note, submit for someone else picker)
2. **Pending** — Stats card + submitted value + gold "Pending validation" badge
3. **Validated** — Stats card + validated value + green "Validated" badge (locked)
4. **Rejected** — Stats card + rejection note + red badge + resubmit form (prefilled with previous values)

### `submission-review.tsx`
Treasurer-only component. Shows pending submissions with:
- Player name and context (start, rebuys, total in)
- Submitted ending stack value
- Photo thumbnail
- Validate button (felt-green) / Reject button (expands inline TextInput for required note)

### `closing-roster.tsx`
Table showing all participants with columns: Name, Start, Rebuys, Total In, Ending, Status. Status badges: Not submitted (gray), Pending (gold), Validated (green), Rejected (red).

## API Methods

| Method | Purpose |
|--------|---------|
| `getEndingSubmissions(sessionId)` | List all submissions for a session |
| `submitEndingStack(req)` | Create pending submission (only while `closing`) |
| `reviewEndingSubmission(req)` | Validate/reject submission (only while `closing`) |

### Request Types

- `SubmitEndingStackRequest`: `sessionId`, `participantId`, `endingStackCents`, `photoUrl` (required), `note?`, `submittedByUserId?`
- `ReviewEndingSubmissionRequest`: `submissionId`, `action: 'validate' | 'reject'`, `reviewNote?`

## App State

The `season_active` state variant includes `endingSubmissions: EndingSubmission[]`.

New actions on `AppStateContextValue`:
- `submitEndingStack(participantId, endingStackCents, photoUrl, note?)` — calls API, refreshes submissions
- `reviewEndingSubmission(submissionId, action, note?)` — calls API, refreshes submissions
- `refreshEndingSubmissions()` — fetch submissions only

The `load()` function fetches participants, injections, and ending submissions in parallel when session state is `closing`.

## Dev Preset

`season_active_closing` — Session in `closing` state with 4 participants and sample submissions:
- Edgar (admin): `validated` — $850 ending stack
- Carlos (treasurer): `pending` — $600 ending stack, with note
- Miguel (host): `rejected` — $300 ending stack, rejection note
- Andres: no submission yet

Activate via Profile tab > Dev Tools > "Active (closing)".

## Enforcement Rules

- `submitEndingStack` only allowed when `session.state === 'closing'`
- `reviewEndingSubmission` only allowed when `session.state === 'closing'` and submission status is `pending`
- Rejection requires a `reviewNote`
- Photo is required for all submissions
- Multiple submissions per participant allowed (latest used for display); only `pending` ones can be reviewed
