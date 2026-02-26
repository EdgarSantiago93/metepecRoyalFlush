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
  | 'season_ended'
  | 'payout_sent'
  | 'payout_confirmed'
  | 'payout_disputed';

const routeMap: Record<NotificationType, string> = {
  deposit_submitted: '/(tabs)',
  deposit_approved: '/(tabs)',
  deposit_rejected: '/(tabs)',
  session_scheduled: '/(tabs)/session',
  session_edited: '/(tabs)/session',
  session_started: '/(tabs)/session',
  session_finalized: '/(tabs)/ledger',
  rebuy_requested: '/(tabs)/session',
  rebuy_approved: '/(tabs)/session',
  rebuy_rejected: '/(tabs)/session',
  submission_submitted: '/(tabs)/session',
  submission_validated: '/(tabs)/session',
  submission_rejected: '/(tabs)/session',
  season_started: '/(tabs)',
  season_ended: '/(tabs)',
  payout_sent: '/(tabs)',
  payout_confirmed: '/(tabs)',
  payout_disputed: '/(tabs)',
};

const titleMap: Record<NotificationType, string> = {
  deposit_submitted: 'Depósito enviado',
  deposit_approved: 'Depósito aprobado',
  deposit_rejected: 'Depósito rechazado',
  session_scheduled: 'Juego programado',
  session_edited: 'Juego editado',
  session_started: 'Juego iniciado',
  session_finalized: 'Juego finalizado',
  rebuy_requested: 'Rebuy solicitado',
  rebuy_approved: 'Rebuy aprobado',
  rebuy_rejected: 'Rebuy rechazado',
  submission_submitted: 'Stack enviado',
  submission_validated: 'Stack validado',
  submission_rejected: 'Stack rechazado',
  season_started: 'Temporada iniciada',
  season_ended: 'Temporada finalizada',
  payout_sent: 'Pago enviado',
  payout_confirmed: 'Pago confirmado',
  payout_disputed: 'Pago disputado',
};

/** Map a notification type to a screen route. Falls back to home tab. */
export function getNotificationRoute(type: string): string {
  return routeMap[type as NotificationType] ?? '/(tabs)';
}

/** Get a human-readable Spanish title for a notification type. */
export function getNotificationTitle(type: string): string {
  return titleMap[type as NotificationType] ?? 'Notificación';
}
