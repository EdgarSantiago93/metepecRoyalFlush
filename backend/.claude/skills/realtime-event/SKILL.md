---
name: realtime-event
description: Add Pusher real-time events and/or Expo push notifications to an endpoint. Use when adding live updates or notification dispatch.
context: fork
agent: general-purpose
---

# Add Real-Time Event / Push Notification

You are adding real-time events (Pusher) and/or push notifications (Expo Push) to the MRF Backend.

## Before starting

1. **Read the spec**: Check `docs/backend-spec.md` §6 (Real-Time Events) and §7 (Push Notifications).
2. **Read existing patterns**: Check `src/realtime/realtime.service.ts` and `src/notifications/notifications.service.ts`.
3. **Identify the trigger**: Which endpoint/action should fire the event?

## Clarification-first rule

Before writing code, ask the USER:
- Should this trigger a Pusher event, a push notification, or both?
- Who are the recipients? (All users, treasurer only, specific participant, etc.)
- What data should the event payload include?
- Is this event already defined in the spec, or is it new?

## Pusher Channels

### Channel strategy

```
private-season-{seasonId}    — Season-wide events
private-session-{sessionId}  — Session-specific events
```

All channels are private (require auth via `POST /pusher/auth`).

### Defined events

| Channel | Event | Trigger |
|---------|-------|---------|
| `private-season-{seasonId}` | `season-updated` | Season create/start/end, deposit review |
| `private-session-{sessionId}` | `session-state-changed` | State transitions |
| `private-session-{sessionId}` | `participant-updated` | Check-in, confirm, dispute, remove, guest add |
| `private-session-{sessionId}` | `injection-updated` | Rebuy request, approve, reject |
| `private-session-{sessionId}` | `submission-updated` | Submit ending, validate, reject |

### Adding a Pusher event

#### 1. In the service, after the database operation:

```typescript
// Inject RealtimeService in constructor
constructor(
  private readonly realtimeService: RealtimeService,
) {}

// After DB write:
await this.realtimeService.triggerSessionEvent(
  session.id,
  'participant-updated',
  {
    action: 'check-in',
    participant: updatedParticipant,
  },
);
```

#### 2. For season-level events:

```typescript
await this.realtimeService.triggerSeasonEvent(
  season.id,
  'season-updated',
  {
    season: updatedSeason,
    members: updatedMembers,
  },
);
```

### Event payload conventions

- Always include the full updated entity (not just the changed fields)
- Include an `action` string for events with multiple triggers (e.g., `participant-updated`)
- Include related entities when the client will need them (e.g., injection with guest-add)

```typescript
// Good: full entity + action
{ action: 'check-in', participant: { id, sessionId, userId, ... } }

// Bad: partial data
{ action: 'check-in', participantId: 'part_01h...' }
```

## Push Notifications

### Notification events → Push messages

| Event | Recipients | Push Title | Push Body |
|-------|-----------|------------|-----------|
| `deposit_submitted` | Treasurer | "Nuevo Depósito" | "{name} envió comprobante de depósito" |
| `deposit_approved` | Member | "Depósito Aprobado" | "Tu depósito fue aprobado" |
| `deposit_rejected` | Member | "Depósito Rechazado" | "Tu depósito fue rechazado" |
| `session_scheduled` | All users | "Juego Programado" | "Nuevo juego programado por {host}" |
| `session_started` | All users | "Juego Iniciado" | "El juego ha comenzado - haz check in" |
| `rebuy_requested` | Treasurer | "Ribeye Solicitado" | "{name} solicitó un ribeye" |
| `rebuy_approved` | Requester | "Ribeye Aprobado" | "Tu ribeye fue aprobado" |
| `rebuy_rejected` | Requester | "Ribeye Rechazado" | "Tu ribeye fue rechazado" |
| `submission_submitted` | Treasurer | "Stack Final Enviado" | "{name} envió su stack final" |
| `submission_validated` | Participant | "Stack Validado" | "Tu stack final fue validado" |
| `submission_rejected` | Participant | "Stack Rechazado" | "Tu stack final fue rechazado" |
| `session_finalized` | All users | "Juego Finalizado" | "El juego fue finalizado" |
| `season_started` | All users | "Temporada Iniciada" | "La temporada ha comenzado" |
| `season_ended` | All users | "Temporada Finalizada" | "La temporada ha terminado" |

### Adding a push notification

#### 1. In the service, after DB write + Pusher event:

```typescript
// Inject NotificationsService
constructor(
  private readonly notificationsService: NotificationsService,
) {}

// Single recipient
await this.notificationsService.notify(
  targetUserId,
  'rebuy_requested',
  {
    title: 'Ribeye Solicitado',
    body: `${playerName} solicitó un ribeye`,
    data: { sessionId: session.id, injectionId: injection.id },
  },
);

// All users
await this.notificationsService.notifyAll(
  'session_scheduled',
  {
    title: 'Juego Programado',
    body: `Nuevo juego programado por ${hostName}`,
    data: { sessionId: session.id },
  },
);
```

#### 2. The NotificationsService handles:
- Creating an in-app `notifications` row
- Looking up the user's `push_token`
- Sending via Expo Push API (if token exists)

### Order of operations

Always follow this sequence in the service method:
1. Validate + execute DB operation
2. Trigger Pusher real-time event
3. Send push notification
4. Return response

Pusher and push are "fire and forget" — wrap in try/catch to prevent notification failures from breaking the main flow:

```typescript
try {
  await this.realtimeService.triggerSessionEvent(...);
  await this.notificationsService.notify(...);
} catch (e) {
  // Log error but don't fail the request
  this.logger.error('Failed to send notification', e);
}
```

## Testing

### Mock real-time in tests

```typescript
const mockRealtimeService = {
  triggerSessionEvent: vi.fn(),
  triggerSeasonEvent: vi.fn(),
};

const mockNotificationsService = {
  notify: vi.fn(),
  notifyAll: vi.fn(),
};

// In test setup:
providers: [
  { provide: RealtimeService, useValue: mockRealtimeService },
  { provide: NotificationsService, useValue: mockNotificationsService },
]

// In assertions:
expect(mockRealtimeService.triggerSessionEvent).toHaveBeenCalledWith(
  sessionId,
  'participant-updated',
  expect.objectContaining({ action: 'check-in' }),
);
```

## Verification

1. `npm run typecheck` — Types compile
2. `npm run test` — Tests pass (with mocked services)
3. Manual test: Start the server, trigger the action, observe Pusher debug console
