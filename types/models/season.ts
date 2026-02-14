// ---------------------------------------------------------------------------
// Season
// ---------------------------------------------------------------------------

export type SeasonStatus = 'setup' | 'active' | 'ended';

/** Only one non-ended season at a time. */
export type Season = {
  id: string; // ULID
  name: string | null;
  status: SeasonStatus;
  createdByUserId: string; // FK → users
  treasurerUserId: string; // FK → users — locked once status = active
  createdAt: string; // ISO datetime
  startedAt: string | null;
  endedAt: string | null;
};

// ---------------------------------------------------------------------------
// Season Member
// ---------------------------------------------------------------------------

export type ApprovalStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

/** Per-season membership: approval status + persistent balance. */
export type SeasonMember = {
  id: string; // ULID
  seasonId: string; // FK → seasons
  userId: string; // FK → users
  approvalStatus: ApprovalStatus;
  currentBalanceCents: number; // MXN cents (100 = 1 peso)
  approvedAt: string | null;
  approvedByUserId: string | null; // FK → users
  rejectionNote: string | null;
  createdAt: string; // ISO datetime
};

// ---------------------------------------------------------------------------
// Season Deposit Submission
// ---------------------------------------------------------------------------

export type DepositSubmissionStatus = 'pending' | 'approved' | 'rejected';

/** History of deposit proof photos per user per season. */
export type SeasonDepositSubmission = {
  id: string; // ULID
  seasonId: string; // FK → seasons
  userId: string; // FK → users
  photoUrl: string;
  note: string | null;
  status: DepositSubmissionStatus;
  reviewedAt: string | null;
  reviewedByUserId: string | null; // FK → users
  reviewNote: string | null;
  createdAt: string; // ISO datetime
};

// ---------------------------------------------------------------------------
// Season Host Order
// ---------------------------------------------------------------------------

/** Planning-only host order. Includes all group members regardless of paid status. */
export type SeasonHostOrder = {
  id: string; // ULID
  seasonId: string; // FK → seasons
  userId: string; // FK → users
  sortIndex: number;
  updatedAt: string; // ISO datetime
};
