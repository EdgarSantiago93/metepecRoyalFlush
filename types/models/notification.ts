export type NotificationType =
  | 'deposit_submitted'
  | 'deposit_approved'
  | 'deposit_rejected'
  | 'session_scheduled'
  | 'session_edited'
  | 'session_started'
  | 'session_finalized'
  | 'rebuy_requested'
  | 'rebuy_approved'
  | 'rebuy_rejected'
  | 'submission_submitted'
  | 'submission_validated'
  | 'submission_rejected'
  | 'season_started'
  | 'season_ended';

/** In-app notification audit trail. */
export type Notification = {
  id: string; // ULID
  userId: string; // FK → users
  type: NotificationType;
  payloadJson: string; // JSON string
  createdAt: string; // ISO datetime
  readAt: string | null;
};
