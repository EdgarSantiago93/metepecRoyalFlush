// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export type SessionState =
  | 'scheduled'
  | 'dealing'
  | 'in_progress'
  | 'closing'
  | 'finalized';

/** A single game night within a season. One non-finalized session at a time per season. */
export type Session = {
  id: string; // ULID
  seasonId: string; // FK → seasons
  state: SessionState;
  hostUserId: string; // FK → users

  // Scheduling
  scheduledFor: string | null; // planned date/time
  location: string | null;
  scheduledAt: string; // ISO datetime
  scheduledByUserId: string; // FK → users

  // Lifecycle timestamps
  startedAt: string | null;
  startedByUserId: string | null; // FK → users
  endedAt: string | null; // when "End Session" pressed
  endedByUserId: string | null; // FK → users
  finalizedAt: string | null;
  finalizedByUserId: string | null; // FK → users
};

// ---------------------------------------------------------------------------
// Session Participant
// ---------------------------------------------------------------------------

export type ParticipantType = 'member' | 'guest_user' | 'guest_ephemeral';

/** Roster entry: season members + guests for a single session. */
export type SessionParticipant = {
  id: string; // ULID
  sessionId: string; // FK → sessions
  type: ParticipantType;
  userId: string | null; // FK → users — for member / guest_user
  guestName: string | null; // for guest_ephemeral

  startingStackCents: number; // MXN cents

  // Check-in / confirmation
  checkedInAt: string | null;
  confirmedStartAt: string | null;
  startDisputeNote: string | null;

  // Removal
  removedAt: string | null;
  removedByUserId: string | null; // FK → users

  createdAt: string; // ISO datetime
};

// ---------------------------------------------------------------------------
// Session Injection (Rebuys + Guest Buy-in)
// ---------------------------------------------------------------------------

export type InjectionType = 'rebuy_500' | 'half_250' | 'guest_buyin_500';

export type InjectionStatus = 'pending' | 'approved' | 'rejected';

/** Cash injection during a session. Only approved injections count in totals. */
export type SessionInjection = {
  id: string; // ULID
  sessionId: string; // FK → sessions
  participantId: string; // FK → session_participants
  type: InjectionType;
  amountCents: number; // MXN cents (50000 = 500 pesos, 25000 = 250 pesos)

  // Request
  requestedByUserId: string | null; // FK → users
  requestedAt: string; // ISO datetime
  proofPhotoUrl: string | null;

  // Approval
  status: InjectionStatus;
  reviewedAt: string | null;
  reviewedByUserId: string | null; // FK → users
  reviewNote: string | null;

  createdAt: string; // ISO datetime
};

// ---------------------------------------------------------------------------
// Ending Submission
// ---------------------------------------------------------------------------

export type EndingSubmissionStatus = 'pending' | 'validated' | 'rejected';

/** EndingStack + required photo proof per participant. */
export type EndingSubmission = {
  id: string; // ULID
  sessionId: string; // FK → sessions
  participantId: string; // FK → session_participants
  endingStackCents: number; // MXN cents
  photoUrl: string;
  submittedAt: string; // ISO datetime
  submittedByUserId: string | null; // FK → users — allows "submit for someone else"
  note: string | null;

  // Validation
  status: EndingSubmissionStatus;
  reviewedAt: string | null;
  reviewedByUserId: string | null; // FK → users
  reviewNote: string | null;

  createdAt: string; // ISO datetime
};

// ---------------------------------------------------------------------------
// Session Finalize Note
// ---------------------------------------------------------------------------

/** Only present when treasurer overrides finalization due to balancing mismatch. */
export type SessionFinalizeNote = {
  id: string; // ULID
  sessionId: string; // FK → sessions (unique)
  note: string;
  createdByUserId: string; // FK → users
  createdAt: string; // ISO datetime
};
