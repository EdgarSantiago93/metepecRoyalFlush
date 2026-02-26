# Push Notifications

## Purpose

Delivers real-time alerts for deposits, rebuys, session events, and season changes via Expo push notifications. Includes a custom in-app banner for foreground display with tap-to-navigate.

## Architecture

### Services (`services/push/`)

- **`push-notification-service.ts`** — Token registration, permission requests, Android channel setup, and foreground notification handler configuration. Calls `Notifications.setNotificationHandler` at module load to suppress OS banners (we show our own).
- **`notification-routing.ts`** — Maps `NotificationType` strings to expo-router paths and Spanish display titles.

### Hook (`hooks/use-push-notifications.ts`)

- Registers push token when user is authenticated
- Listens for foreground notifications and emits banner data
- Listens for background tap responses and navigates to the correct screen
- Listens for token refreshes and re-syncs to server
- Returns `bannerData` for the `NotificationBanner` component

### Component (`components/ui/notification-banner.tsx`)

- Animated slide-down banner using `react-native-reanimated`
- Shows sender avatar, title, and body
- Tap navigates to relevant screen
- Auto-dismisses after 4 seconds
- Swipe-up-to-dismiss via gesture handler

### Backend Integration

- `PUT /users/me/push-token` — Register or clear the push token
- `POST /auth/logout` — Server-side logout (clears push token)

## Notification Types

| Type | Route | Spanish Title |
|------|-------|---------------|
| `deposit_submitted` | `/(tabs)` | Deposito enviado |
| `deposit_approved` | `/(tabs)` | Deposito aprobado |
| `deposit_rejected` | `/(tabs)` | Deposito rechazado |
| `session_scheduled` | `/(tabs)/session` | Juego programado |
| `session_edited` | `/(tabs)/session` | Juego editado |
| `session_started` | `/(tabs)/session` | Juego iniciado |
| `session_finalized` | `/(tabs)/ledger` | Juego finalizado |
| `rebuy_requested` | `/(tabs)/session` | Rebuy solicitado |
| `rebuy_approved` | `/(tabs)/session` | Rebuy aprobado |
| `rebuy_rejected` | `/(tabs)/session` | Rebuy rechazado |
| `submission_submitted` | `/(tabs)/session` | Stack enviado |
| `submission_validated` | `/(tabs)/session` | Stack validado |
| `submission_rejected` | `/(tabs)/session` | Stack rechazado |
| `season_started` | `/(tabs)` | Temporada iniciada |
| `season_ended` | `/(tabs)` | Temporada finalizada |
| `payout_sent` | `/(tabs)` | Pago enviado |
| `payout_confirmed` | `/(tabs)` | Pago confirmado |
| `payout_disputed` | `/(tabs)` | Pago disputado |

## Expected Push Payload

The backend should send notifications with this data shape:

```json
{
  "type": "deposit_approved",
  "title": "Deposito aprobado",
  "body": "Tu deposito de $500 fue aprobado",
  "senderName": "Edgar",
  "senderAvatarMediaId": "media_abc123"
}
```

## Flow

1. User authenticates -> `usePushNotifications` registers token via `registerForPushNotifications()`
2. Token sent to backend via `PUT /users/me/push-token`
3. Backend sends push notification -> `expo-notifications` receives it
4. **Foreground**: OS banner suppressed, custom `NotificationBanner` slides down
5. **Background/killed**: OS notification shown, tap opens app and navigates
6. **Logout**: `POST /auth/logout` clears token server-side

## Testing

1. Login with magic link -> verify push token registered (check server logs)
2. Send test notification from backend -> foreground banner appears
3. Tap banner -> navigates to correct screen
4. Banner auto-dismisses after 4s
5. Swipe up -> banner dismisses immediately
6. Background notification -> tap OS notification -> app opens to correct screen
7. Logout -> `POST /auth/logout` called
