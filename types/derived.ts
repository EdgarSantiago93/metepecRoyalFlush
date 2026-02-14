/**
 * Derived / computed types — not persisted, calculated at runtime.
 *
 * Math reference (all values in cents):
 *   SessionPnL = endingStackCents - startingStackCents - approvedInjectionsTotalCents
 *   Balancing invariant: Sum(SessionPnL for all participants) == 0
 *   Season balance update on finalize: seasonMember.currentBalanceCents = endingStackCents
 */

/** Per-participant computed result for a finalized (or in-progress) session. */
export type ParticipantSessionResult = {
  participantId: string;
  displayName: string;
  startingStackCents: number;
  approvedInjectionsTotalCents: number;
  endingStackCents: number;
  sessionPnlCents: number; // ending - starting - injections
};

/** Session-level balance check before finalization. */
export type SessionBalanceCheck = {
  sessionId: string;
  participants: ParticipantSessionResult[];
  sumPnlCents: number; // should be 0
  isBalanced: boolean;
};

/** Per-player season-level summary for ledger views. */
export type PlayerSeasonSummary = {
  userId: string;
  displayName: string;
  currentBalanceCents: number;
  sessionsPlayed: number;
  totalInjectionsCents: number;
  totalPnlCents: number;
};
