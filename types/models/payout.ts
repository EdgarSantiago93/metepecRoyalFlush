export type PayoutStatus = 'pending' | 'confirmed' | 'disputed';

/** Tracks a treasurer-to-player payout at end of season. */
export type SeasonPayout = {
  id: string; // ULID
  seasonId: string; // FK → seasons
  fromUserId: string; // FK → users (treasurer)
  toUserId: string; // FK → users (player receiving funds)
  amountCents: number; // MXN cents — the player's ending season balance
  status: PayoutStatus;
  proofPhotoUrl: string | null; // transfer proof uploaded by treasurer
  note: string | null; // optional note from treasurer
  confirmedAt: string | null; // ISO datetime — when player confirmed receipt
  disputedAt: string | null; // ISO datetime — when player disputed
  disputeNote: string | null; // reason for dispute
  resolvedAt: string | null; // ISO datetime — when dispute was resolved
  createdAt: string; // ISO datetime
};
