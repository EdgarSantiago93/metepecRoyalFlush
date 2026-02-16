# Backend Service Specification — Metepec Royal Flush

> Reference document for building the production backend. Covers stack, architecture, database schema, API endpoints, real-time events, push notifications, auth, file uploads, and deployment.

---

## 1. Technology Stack

| Concern | Choice | Notes |
|---------|--------|-------|
| **Framework** | NestJS | TypeScript, modular, decorator-based |
| **Database** | Turso (libSQL) | Managed SQLite at the edge |
| **ORM** | Drizzle ORM | Type-safe, lightweight, native libSQL driver |
| **Auth** | Passwordless magic links via **Resend** | See §3 for full flow |
| **File Storage** | Cloudflare R2 | S3-compatible, presigned URLs |
| **Real-time** | Pusher Channels | WebSocket push for live session events |
| **Push Notifications** | Expo Push Notifications | Both in-app + device push |
| **ID Generation** | [TypeID](https://github.com/jetify-com/typeid) | Type-prefixed, K-sortable UUIDv7 (`user_01h455vb4p...`) |
| **Deployment** | Fly.io (tentative) | Single-region, persistent process for Pusher |
| **Repository** | Separate repo | Types duplicated from frontend |

### Why These Choices

- **NestJS** gives structure (modules, guards, interceptors, pipes) that scales well as the domain grows. Decorators for roles/permissions map cleanly to the treasurer/admin/player model.
- **Turso + Drizzle** is the natural SQLite-at-the-edge pairing. Turso handles replication; Drizzle gives type-safe queries without Prisma's code generation step.
- **Resend** for magic links is simple, cheap, and purpose-built for transactional email. No auth provider overhead for a 10-person private group.
- **Pusher** avoids managing WebSocket infrastructure. The app needs real-time during sessions (check-ins, rebuys, submissions) but not at massive scale.
- **Fly.io** supports persistent processes (needed for Pusher server-side triggers) and is simple to deploy NestJS apps to.
- **TypeID** adds a type prefix to every ID so you can tell what entity an ID belongs to at a glance — invaluable for debugging, logging, and API responses. Based on UUIDv7 (K-sortable).

### TypeID Prefixes

Every entity ID is a TypeID with a model-specific prefix. Stored as TEXT in the database.

| Model | Prefix | Example |
|-------|--------|---------|
| `users` | `user` | `user_01h455vb4pex5vsknk084sn02q` |
| `magic_links` | `mlink` | `mlink_01h455vb4pex5vsknk084sn02q` |
| `seasons` | `sea` | `sea_01h455vb4pex5vsknk084sn02q` |
| `season_members` | `smem` | `smem_01h455vb4pex5vsknk084sn02q` |
| `season_deposit_submissions` | `dep` | `dep_01h455vb4pex5vsknk084sn02q` |
| `season_host_order` | `hord` | `hord_01h455vb4pex5vsknk084sn02q` |
| `sessions` | `ses` | `ses_01h455vb4pex5vsknk084sn02q` |
| `session_participants` | `part` | `part_01h455vb4pex5vsknk084sn02q` |
| `session_injections` | `inj` | `inj_01h455vb4pex5vsknk084sn02q` |
| `ending_submissions` | `esub` | `esub_01h455vb4pex5vsknk084sn02q` |
| `session_finalize_notes` | `fnote` | `fnote_01h455vb4pex5vsknk084sn02q` |
| `notifications` | `notif` | `notif_01h455vb4pex5vsknk084sn02q` |

### TypeID Helper

```typescript
import { typeid } from 'typeid-js';

// Generation
const userId = typeid('user').toString();    // "user_01h455vb4p..."
const sessionId = typeid('ses').toString();  // "ses_01h455vb4p..."

// Validation — use in NestJS pipe
import { TypeID } from 'typeid-js';

function validateTypeId(value: string, expectedPrefix: string): string {
  const parsed = TypeID.fromString(value);
  if (parsed.getType() !== expectedPrefix) {
    throw new Error(`Expected ${expectedPrefix} ID, got ${parsed.getType()}`);
  }
  return value;
}
```

### Validation Pipe

```typescript
// Used as @Param('id', new TypeIdPipe('ses')) id: string
@Injectable()
export class TypeIdPipe implements PipeTransform {
  constructor(private prefix: string) {}

  transform(value: string) {
    try {
      const parsed = TypeID.fromString(value);
      if (parsed.getType() !== this.prefix) {
        throw new BadRequestException(
          `Invalid ID: expected ${this.prefix} prefix, got ${parsed.getType()}`,
        );
      }
      return value;
    } catch {
      throw new BadRequestException(`Invalid TypeID format: ${value}`);
    }
  }
}
```

---

## 2. Project Structure

```
mrf-backend/
├── src/
│   ├── main.ts                      # Bootstrap
│   ├── app.module.ts                # Root module
│   │
│   ├── common/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts        # JWT verification
│   │   │   └── roles.guard.ts       # @Roles() decorator enforcement
│   │   ├── decorators/
│   │   │   ├── current-user.ts      # @CurrentUser() param decorator
│   │   │   └── roles.ts             # @Roles('treasurer', 'admin') decorator
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── pipes/
│   │   │   └── typeid-validation.pipe.ts
│   │   └── utils/
│   │       ├── typeid.ts            # TypeID generation helpers
│   │       └── money.ts             # Cents helpers
│   │
│   ├── config/
│   │   └── env.ts                   # Validated env config (Zod)
│   │
│   ├── db/
│   │   ├── schema/                  # Drizzle table definitions
│   │   │   ├── users.ts
│   │   │   ├── seasons.ts
│   │   │   ├── sessions.ts
│   │   │   └── notifications.ts
│   │   ├── migrations/              # Drizzle migration files
│   │   ├── seed.ts                  # Initial user seed
│   │   ├── drizzle.module.ts        # Provides db client
│   │   └── drizzle.config.ts        # Drizzle Kit config
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts       # POST /auth/magic-link, POST /auth/verify
│   │   ├── auth.service.ts          # Magic link generation, verification, JWT
│   │   └── strategies/
│   │       └── jwt.strategy.ts      # Passport JWT strategy
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts      # GET /users
│   │   └── users.service.ts
│   │
│   ├── seasons/
│   │   ├── seasons.module.ts
│   │   ├── seasons.controller.ts    # Season CRUD + lifecycle
│   │   ├── seasons.service.ts
│   │   ├── deposits/
│   │   │   ├── deposits.controller.ts
│   │   │   └── deposits.service.ts
│   │   └── host-order/
│   │       ├── host-order.controller.ts
│   │       └── host-order.service.ts
│   │
│   ├── sessions/
│   │   ├── sessions.module.ts
│   │   ├── sessions.controller.ts   # Session lifecycle
│   │   ├── sessions.service.ts
│   │   ├── participants/
│   │   │   ├── participants.controller.ts
│   │   │   └── participants.service.ts
│   │   ├── injections/
│   │   │   ├── injections.controller.ts
│   │   │   └── injections.service.ts
│   │   ├── submissions/
│   │   │   ├── submissions.controller.ts
│   │   │   └── submissions.service.ts
│   │   └── finalization/
│   │       ├── finalization.controller.ts
│   │       └── finalization.service.ts
│   │
│   ├── ledger/
│   │   ├── ledger.module.ts
│   │   ├── ledger.controller.ts     # GET /ledger/sessions, /ledger/sessions/:id
│   │   └── ledger.service.ts
│   │
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   ├── notifications.service.ts # In-app + push dispatch
│   │   └── expo-push.service.ts     # Expo Push API client
│   │
│   ├── realtime/
│   │   ├── realtime.module.ts
│   │   └── realtime.service.ts      # Pusher trigger wrapper
│   │
│   └── uploads/
│       ├── uploads.module.ts
│       ├── uploads.controller.ts    # POST /uploads/presigned-url
│       └── uploads.service.ts       # R2 presigned URL generation
│
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 3. Authentication

### Flow: Passwordless Magic Links

This is a private app for ~10 players. Passwords are unnecessary. Magic links via email are simple and secure.

```
Client                          Backend                         Resend
  │                                │                               │
  ├─ POST /auth/magic-link ───────►│                               │
  │   { email }                    ├── Check email in users table   │
  │                                ├── Generate 6-digit code        │
  │                                ├── Store code + expiry (15min)  │
  │                                ├── Send email via Resend ──────►│
  │                                │                               │
  │◄── { success: true } ─────────┤                               │
  │                                │                               │
  │   (user checks email)         │                               │
  │                                │                               │
  ├─ POST /auth/verify ──────────►│                               │
  │   { email, code }             ├── Validate code + expiry       │
  │                                ├── Delete code (single-use)     │
  │                                ├── Generate JWT (7-day expiry)  │
  │◄── { token, user } ──────────┤                               │
  │                                │                               │
  │   (all subsequent requests)   │                               │
  ├─ GET /... ────────────────────►│                               │
  │   Authorization: Bearer <jwt> ├── Verify JWT                   │
  │◄── { ... } ───────────────────┤                               │
```

### Magic Link Storage

Use a `magic_links` table (or in-memory with TTL if preferred):

```sql
CREATE TABLE magic_links (
  id          TEXT PRIMARY KEY,  -- TypeID (mlink_...)
  email       TEXT NOT NULL,
  code        TEXT NOT NULL,     -- 6-digit numeric code
  expires_at  TEXT NOT NULL,     -- ISO datetime, 15 min from creation
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
```

### JWT Payload

```typescript
{
  sub: string;       // user.id (TypeID, e.g. "user_01h...")
  email: string;
  isAdmin: boolean;
  iat: number;
  exp: number;       // 7 days
}
```

### Auth Guard

All endpoints except `/auth/magic-link` and `/auth/verify` require a valid JWT via `Authorization: Bearer <token>`.

### Role Resolution

Roles are determined per-request from the JWT + season context:
- **Admin**: `user.isAdmin === true`
- **Treasurer**: `user.id === season.treasurerUserId` (requires active season lookup)
- **Player**: any authenticated user who is an approved season member

```typescript
// @Roles('treasurer', 'admin') — requires at least one of these roles
// The guard resolves the active season and checks the user against it
```

---

## 4. Database Schema (Drizzle)

All tables use TypeID primary keys (type-prefixed, stored as TEXT), ISO datetime strings, and INTEGER cents for money.

### 4.1 `users`

```typescript
export const users = sqliteTable('users', {
  id:          text('id').primaryKey(),
  email:       text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  isAdmin:     integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  pushToken:   text('push_token'),  // Expo push token, nullable
  createdAt:   text('created_at').notNull(),
});
```

### 4.2 `magic_links`

```typescript
export const magicLinks = sqliteTable('magic_links', {
  id:        text('id').primaryKey(),
  email:     text('email').notNull(),
  code:      text('code').notNull(),
  expiresAt: text('expires_at').notNull(),
  used:      integer('used', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});
```

### 4.3 `seasons`

```typescript
export const seasons = sqliteTable('seasons', {
  id:               text('id').primaryKey(),
  name:             text('name'),
  status:           text('status', { enum: ['setup', 'active', 'ended'] }).notNull(),
  createdByUserId:  text('created_by_user_id').notNull().references(() => users.id),
  treasurerUserId:  text('treasurer_user_id').notNull().references(() => users.id),
  createdAt:        text('created_at').notNull(),
  startedAt:        text('started_at'),
  endedAt:          text('ended_at'),
});
```

### 4.4 `season_members`

```typescript
export const seasonMembers = sqliteTable('season_members', {
  id:                text('id').primaryKey(),
  seasonId:          text('season_id').notNull().references(() => seasons.id),
  userId:            text('user_id').notNull().references(() => users.id),
  approvalStatus:    text('approval_status', {
                       enum: ['not_submitted', 'pending', 'approved', 'rejected'],
                     }).notNull().default('not_submitted'),
  currentBalanceCents: integer('current_balance_cents').notNull().default(0),
  approvedAt:        text('approved_at'),
  approvedByUserId:  text('approved_by_user_id').references(() => users.id),
  rejectionNote:     text('rejection_note'),
  createdAt:         text('created_at').notNull(),
}, (t) => ({
  uniqueMember: unique().on(t.seasonId, t.userId),
}));
```

### 4.5 `season_deposit_submissions`

```typescript
export const seasonDepositSubmissions = sqliteTable('season_deposit_submissions', {
  id:               text('id').primaryKey(),
  seasonId:         text('season_id').notNull().references(() => seasons.id),
  userId:           text('user_id').notNull().references(() => users.id),
  photoUrl:         text('photo_url').notNull(),
  note:             text('note'),
  status:           text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull(),
  reviewedAt:       text('reviewed_at'),
  reviewedByUserId: text('reviewed_by_user_id').references(() => users.id),
  reviewNote:       text('review_note'),
  createdAt:        text('created_at').notNull(),
});
```

### 4.6 `season_host_order`

```typescript
export const seasonHostOrder = sqliteTable('season_host_order', {
  id:        text('id').primaryKey(),
  seasonId:  text('season_id').notNull().references(() => seasons.id),
  userId:    text('user_id').notNull().references(() => users.id),
  sortIndex: integer('sort_index').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  uniqueMember: unique().on(t.seasonId, t.userId),
}));
```

### 4.7 `sessions`

```typescript
export const sessions = sqliteTable('sessions', {
  id:                  text('id').primaryKey(),
  seasonId:            text('season_id').notNull().references(() => seasons.id),
  state:               text('state', {
                         enum: ['scheduled', 'dealing', 'in_progress', 'closing', 'finalized'],
                       }).notNull(),
  hostUserId:          text('host_user_id').notNull().references(() => users.id),
  scheduledFor:        text('scheduled_for'),
  location:            text('location'),
  scheduledAt:         text('scheduled_at').notNull(),
  scheduledByUserId:   text('scheduled_by_user_id').notNull().references(() => users.id),
  startedAt:           text('started_at'),
  startedByUserId:     text('started_by_user_id').references(() => users.id),
  endedAt:             text('ended_at'),
  endedByUserId:       text('ended_by_user_id').references(() => users.id),
  finalizedAt:         text('finalized_at'),
  finalizedByUserId:   text('finalized_by_user_id').references(() => users.id),
});
```

### 4.8 `session_participants`

```typescript
export const sessionParticipants = sqliteTable('session_participants', {
  id:               text('id').primaryKey(),
  sessionId:        text('session_id').notNull().references(() => sessions.id),
  type:             text('type', { enum: ['member', 'guest_user', 'guest_ephemeral'] }).notNull(),
  userId:           text('user_id').references(() => users.id),
  guestName:        text('guest_name'),
  startingStackCents: integer('starting_stack_cents').notNull(),
  checkedInAt:      text('checked_in_at'),
  confirmedStartAt: text('confirmed_start_at'),
  startDisputeNote: text('start_dispute_note'),
  removedAt:        text('removed_at'),
  removedByUserId:  text('removed_by_user_id').references(() => users.id),
  createdAt:        text('created_at').notNull(),
});
```

### 4.9 `session_injections`

```typescript
export const sessionInjections = sqliteTable('session_injections', {
  id:               text('id').primaryKey(),
  sessionId:        text('session_id').notNull().references(() => sessions.id),
  participantId:    text('participant_id').notNull().references(() => sessionParticipants.id),
  type:             text('type', { enum: ['rebuy_500', 'half_250', 'guest_buyin_500'] }).notNull(),
  amountCents:      integer('amount_cents').notNull(),
  requestedByUserId: text('requested_by_user_id').references(() => users.id),
  requestedAt:      text('requested_at').notNull(),
  proofPhotoUrl:    text('proof_photo_url'),
  status:           text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull(),
  reviewedAt:       text('reviewed_at'),
  reviewedByUserId: text('reviewed_by_user_id').references(() => users.id),
  reviewNote:       text('review_note'),
  createdAt:        text('created_at').notNull(),
});
```

### 4.10 `ending_submissions`

```typescript
export const endingSubmissions = sqliteTable('ending_submissions', {
  id:               text('id').primaryKey(),
  sessionId:        text('session_id').notNull().references(() => sessions.id),
  participantId:    text('participant_id').notNull().references(() => sessionParticipants.id),
  endingStackCents: integer('ending_stack_cents').notNull(),
  photoUrl:         text('photo_url').notNull(),
  submittedAt:      text('submitted_at').notNull(),
  submittedByUserId: text('submitted_by_user_id').references(() => users.id),
  note:             text('note'),
  status:           text('status', { enum: ['pending', 'validated', 'rejected'] }).notNull(),
  reviewedAt:       text('reviewed_at'),
  reviewedByUserId: text('reviewed_by_user_id').references(() => users.id),
  reviewNote:       text('review_note'),
  createdAt:        text('created_at').notNull(),
});
```

### 4.11 `session_finalize_notes`

```typescript
export const sessionFinalizeNotes = sqliteTable('session_finalize_notes', {
  id:              text('id').primaryKey(),
  sessionId:       text('session_id').notNull().references(() => sessions.id).unique(),
  note:            text('note').notNull(),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  createdAt:       text('created_at').notNull(),
});
```

### 4.12 `notifications`

```typescript
export const notifications = sqliteTable('notifications', {
  id:          text('id').primaryKey(),
  userId:      text('user_id').notNull().references(() => users.id),
  type:        text('type').notNull(),  // NotificationType enum values
  payloadJson: text('payload_json').notNull(),
  createdAt:   text('created_at').notNull(),
  readAt:      text('read_at'),
});
```

### Indexes

```typescript
// Performance-critical queries
createIndex('idx_season_members_season').on(seasonMembers.seasonId);
createIndex('idx_season_members_user').on(seasonMembers.userId);
createIndex('idx_sessions_season').on(sessions.seasonId);
createIndex('idx_sessions_state').on(sessions.state);
createIndex('idx_participants_session').on(sessionParticipants.sessionId);
createIndex('idx_injections_session').on(sessionInjections.sessionId);
createIndex('idx_injections_participant').on(sessionInjections.participantId);
createIndex('idx_submissions_session').on(endingSubmissions.sessionId);
createIndex('idx_submissions_participant').on(endingSubmissions.participantId);
createIndex('idx_notifications_user').on(notifications.userId);
createIndex('idx_deposit_subs_season_user').on(seasonDepositSubmissions.seasonId, seasonDepositSubmissions.userId);
```

### Seed Data

Pre-populate `users` table with the 10 group members:

```typescript
const SEED_USERS = [
  { email: 'edgar@poker.local', displayName: 'Edgar', isAdmin: true },
  { email: 'carlos@poker.local', displayName: 'Carlos', isAdmin: false },
  { email: 'miguel@poker.local', displayName: 'Miguel', isAdmin: false },
  { email: 'luis@poker.local', displayName: 'Luis', isAdmin: false },
  { email: 'javier@poker.local', displayName: 'Javier', isAdmin: false },
  { email: 'roberto@poker.local', displayName: 'Roberto', isAdmin: false },
  { email: 'andres@poker.local', displayName: 'Andrés', isAdmin: false },
  { email: 'diego@poker.local', displayName: 'Diego', isAdmin: false },
  { email: 'fernando@poker.local', displayName: 'Fernando', isAdmin: false },
  { email: 'pablo@poker.local', displayName: 'Pablo', isAdmin: false },
];
```

---

## 5. API Endpoints

All endpoints return JSON. All require `Authorization: Bearer <jwt>` unless noted. Money values are **integers in MXN cents**.

### 5.1 Auth

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/auth/magic-link` | None | `{ email }` | `{ success, message }` |
| `POST` | `/auth/verify` | None | `{ email, code }` | `{ token, user }` |
| `GET` | `/auth/me` | JWT | — | `{ user }` |

**`POST /auth/magic-link`**
- Validate email exists in `users` table
- Generate 6-digit code, store in `magic_links` with 15-min expiry
- Send code via Resend email
- Return `{ success: true, message: "Login link sent" }`
- If email not found: return `{ success: false, message: "Email not registered" }`

**`POST /auth/verify`**
- Look up latest unused magic link for email
- Validate code matches and not expired
- Mark as used
- Generate JWT (7-day expiry)
- Return `{ token, user }`

**`GET /auth/me`**
- Return current user from JWT

### 5.2 Users

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/users` | JWT | `{ users: User[] }` |
| `PUT` | `/users/me/push-token` | JWT | `{ success }` |

**`PUT /users/me/push-token`**
- Body: `{ pushToken: string }`
- Stores Expo push token for the authenticated user
- Called on app startup / token refresh

### 5.3 Seasons

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| `GET` | `/seasons/active` | JWT | Any | — | `{ season, members }` |
| `POST` | `/seasons` | JWT | Admin | `{ treasurerUserId, name? }` | `{ season, members }` |
| `PUT` | `/seasons/:id/treasurer` | JWT | Admin | `{ treasurerUserId }` | `{ season }` |
| `POST` | `/seasons/:id/start` | JWT | Treasurer | — | `{ season }` |
| `POST` | `/seasons/:id/end` | JWT | Treasurer | — | `{ season }` |

**`POST /seasons`** (Create Season)
- Validate: no active (non-ended) season exists
- Validate: `treasurerUserId` is a valid user
- Create season with `status = 'setup'`
- Create `season_members` for ALL users with `approval_status = 'not_submitted'`
- Create `season_host_order` for ALL users with randomized `sort_index`
- Broadcast: Pusher `season-updated`
- Notify: all users → `season_started` (type: created)

**`PUT /seasons/:id/treasurer`** (Change Treasurer)
- Validate: season is in `setup` state
- Update `treasurer_user_id`

**`POST /seasons/:id/start`** (Start Season)
- Validate: season is in `setup` state
- Validate: at least 2 members have `approval_status = 'approved'`
- Set `status = 'active'`, `started_at = now()`
- On approval: set `current_balance_cents = 50000` (500 MXN)
- Broadcast: Pusher `season-updated`
- Notify: all users → `season_started`

**`POST /seasons/:id/end`** (End Season)
- Validate: season is `active`
- Validate: no non-finalized session exists
- Set `status = 'ended'`, `ended_at = now()`
- Broadcast: Pusher `season-updated`
- Notify: all users → `season_ended`

### 5.4 Deposits

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| `GET` | `/seasons/:id/deposits` | JWT | Any | — | `{ submissions }` |
| `POST` | `/seasons/:id/deposits` | JWT | Member | `{ photoUrl, note? }` | `{ submission, member }` |
| `POST` | `/deposits/:id/review` | JWT | Treasurer | `{ action, reviewNote? }` | `{ submission, member }` |

**`POST /seasons/:id/deposits`** (Submit Deposit)
- Upload photo first via `/uploads/presigned-url`, then pass the URL
- Create submission with `status = 'pending'`
- Update member `approval_status = 'pending'`
- Notify: treasurer → `deposit_submitted`
- Broadcast: Pusher `season-updated`

**`POST /deposits/:id/review`** (Review Deposit)
- `action: 'approve' | 'reject'`
- Reject requires `reviewNote`
- On approve: set member `approval_status = 'approved'`, `current_balance_cents = 50000`
- On reject: set member `approval_status = 'rejected'`, store `rejection_note`
- Notify: member → `deposit_approved` or `deposit_rejected`
- Broadcast: Pusher `season-updated`

### 5.5 Host Order

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| `GET` | `/seasons/:id/host-order` | JWT | Any | — | `{ hostOrder }` |
| `PUT` | `/seasons/:id/host-order` | JWT | Admin | `{ userIds: string[] }` | `{ hostOrder }` |

**`PUT /seasons/:id/host-order`** (Save Host Order)
- Replace all host order entries for the season
- `userIds` array defines the order (index = sortIndex)

### 5.6 Sessions — Lifecycle

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| `POST` | `/sessions` | JWT | Treasurer/Admin | `{ seasonId, hostUserId, scheduledFor?, location? }` | `{ session }` |
| `PUT` | `/sessions/:id` | JWT | Treasurer/Admin | `{ hostUserId?, scheduledFor?, location? }` | `{ session }` |
| `POST` | `/sessions/:id/start-dealing` | JWT | Treasurer/Admin | — | `{ session }` |
| `POST` | `/sessions/:id/move-to-in-progress` | JWT | Treasurer/Admin | — | `{ session }` |
| `POST` | `/sessions/:id/end` | JWT | Treasurer/Admin | — | `{ session }` |

**`POST /sessions`** (Schedule Session)
- Validate: season is `active`
- Validate: no other non-finalized session in this season
- Create session with `state = 'scheduled'`
- Notify: all users → `session_scheduled`
- Broadcast: Pusher `session-updated`

**`POST /sessions/:id/start-dealing`** (Start Dealing)
- Transition: `scheduled` → `dealing`
- Set `started_at`, `started_by_user_id`
- Notify: all users → `session_started`
- Broadcast: Pusher `session-state-changed` with `{ state: 'dealing' }`

**`POST /sessions/:id/move-to-in-progress`** (Begin Play)
- Validate: at least 2 checked-in, non-removed participants
- Validate: all checked-in participants have `confirmed_start_at` set
- Validate: no unresolved disputes (`start_dispute_note` set but no `confirmed_start_at`)
- Transition: `dealing` → `in_progress`
- Broadcast: Pusher `session-state-changed` with `{ state: 'in_progress' }`

**`POST /sessions/:id/end`** (End Session → Closing)
- Transition: `in_progress` → `closing`
- Set `ended_at`, `ended_by_user_id`
- Block any new rebuy requests
- Broadcast: Pusher `session-state-changed` with `{ state: 'closing' }`

### 5.7 Sessions — Participants

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| `GET` | `/sessions/:id/participants` | JWT | Any | — | `{ participants }` |
| `POST` | `/sessions/:id/check-in` | JWT | Approved member | — | `{ participant }` |
| `POST` | `/sessions/:id/participants/:pid/confirm` | JWT | Self | — | `{ participant }` |
| `POST` | `/sessions/:id/participants/:pid/dispute` | JWT | Self | `{ note }` | `{ participant }` |
| `POST` | `/sessions/:id/participants/:pid/remove` | JWT | Treasurer/Admin | — | `{ participant }` |
| `POST` | `/sessions/:id/guests` | JWT | Treasurer/Admin | `{ guestName }` | `{ participant, injection }` |

**`POST /sessions/:id/check-in`**
- Validate: session is `dealing`
- Validate: user is approved season member, not already checked in
- Derive `starting_stack_cents`:
  - First session of season → `50000` (500 MXN)
  - Otherwise → member's `current_balance_cents` from last finalized session
- Set `checked_in_at = now()`
- Broadcast: Pusher `participant-updated` with `{ action: 'check-in', participantId }`

**`POST /sessions/:id/participants/:pid/confirm`**
- Validate: session is `dealing`, participant is checked in, user is the participant
- Set `confirmed_start_at = now()`, clear `start_dispute_note`
- Broadcast: Pusher `participant-updated` with `{ action: 'confirmed', participantId }`

**`POST /sessions/:id/participants/:pid/dispute`**
- Set `start_dispute_note`, clear `confirmed_start_at`
- Broadcast: Pusher `participant-updated` with `{ action: 'disputed', participantId }`

**`POST /sessions/:id/participants/:pid/remove`**
- Set `removed_at`, `removed_by_user_id`
- If `guest_ephemeral`: also delete/cancel associated `guest_buyin_500` injection
- Broadcast: Pusher `participant-updated` with `{ action: 'removed', participantId }`

**`POST /sessions/:id/guests`** (Add Guest)
- Validate: session is `dealing`
- Create participant with `type = 'guest_ephemeral'`, `starting_stack_cents = 0`
- Auto-create injection: `{ type: 'guest_buyin_500', amountCents: 50000, status: 'approved' }`
- Broadcast: Pusher `participant-updated` with `{ action: 'guest-added' }`

### 5.8 Sessions — Injections (Rebuys)

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| `GET` | `/sessions/:id/injections` | JWT | Any | — | `{ injections }` |
| `POST` | `/sessions/:id/injections` | JWT | Participant | `{ type, proofPhotoUrl? }` | `{ injection }` |
| `POST` | `/injections/:id/review` | JWT | Treasurer/Admin | `{ action, reviewNote? }` | `{ injection }` |

**`POST /sessions/:id/injections`** (Request Rebuy)
- Validate: session is `in_progress`
- `type: 'rebuy_500' | 'half_250'`
- `amountCents`: `rebuy_500` → 50000, `half_250` → 25000
- Create with `status = 'pending'`
- Notify: treasurer → `rebuy_requested`
- Broadcast: Pusher `injection-updated` with `{ action: 'requested', injectionId }`

**`POST /injections/:id/review`** (Approve/Reject Rebuy)
- `action: 'approve' | 'reject'`
- Reject requires `reviewNote`
- Set `reviewed_at`, `reviewed_by_user_id`, `status`
- Notify: requester → `rebuy_approved` or `rebuy_rejected`
- Broadcast: Pusher `injection-updated` with `{ action: 'approved' | 'rejected', injectionId }`

### 5.9 Sessions — Ending Submissions

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| `GET` | `/sessions/:id/submissions` | JWT | Any | — | `{ submissions }` |
| `POST` | `/sessions/:id/submissions` | JWT | Participant | `{ participantId, endingStackCents, photoUrl, note?, submittedByUserId? }` | `{ submission }` |
| `POST` | `/submissions/:id/review` | JWT | Treasurer/Admin | `{ action, reviewNote? }` | `{ submission }` |

**`POST /sessions/:id/submissions`** (Submit Ending Stack)
- Validate: session is `closing`
- `photoUrl` is required
- `submittedByUserId` allows treasurer to submit on behalf of another
- Creates submission with `status = 'pending'`
- Resubmits: new row inserted (latest is the active one)
- Notify: treasurer → `submission_submitted`
- Broadcast: Pusher `submission-updated` with `{ action: 'submitted', participantId }`

**`POST /submissions/:id/review`** (Validate/Reject Submission)
- `action: 'validate' | 'reject'`
- Reject requires `reviewNote`
- Notify: participant → `submission_validated` or `submission_rejected`
- Broadcast: Pusher `submission-updated` with `{ action: 'validated' | 'rejected', participantId }`

### 5.10 Sessions — Finalization

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| `POST` | `/sessions/:id/finalize` | JWT | Treasurer/Admin | `{ overrideNote? }` | `{ session, members, finalizeNote }` |
| `GET` | `/sessions/:id/finalize-note` | JWT | Any | — | `{ finalizeNote }` |

**`POST /sessions/:id/finalize`**
- Validate: session is `closing`
- Validate: ALL non-removed participants have a `validated` ending submission
- Compute PnL for each participant: `endingStack - startingStack - approvedInjections`
- Compute `sumPnL = sum(all PnLs)`
- If `sumPnL !== 0` and no `overrideNote`: return 400 error
- If `sumPnL !== 0` and `overrideNote` provided: create `session_finalize_notes` entry
- Set `state = 'finalized'`, `finalized_at`, `finalized_by_user_id`
- **Update season balances**: for each **member** participant, set `season_members.current_balance_cents = endingStackCents`
- Notify: all users → `session_finalized`
- Broadcast: Pusher `session-state-changed` with `{ state: 'finalized' }`

### 5.11 Ledger

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/seasons/:id/sessions` | JWT | `{ sessions: Session[] }` |
| `GET` | `/sessions/:id/detail` | JWT | `{ session, participants, injections, endingSubmissions, finalizeNote }` |

These are read-only endpoints used by the Ledger tab.

### 5.12 Notifications

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/notifications` | JWT | `{ notifications: Notification[] }` |
| `POST` | `/notifications/:id/read` | JWT | `{ notification }` |
| `POST` | `/notifications/read-all` | JWT | `{ count }` |

### 5.13 File Uploads

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/uploads/presigned-url` | JWT | `{ contentType, purpose }` | `{ uploadUrl, fileUrl }` |

**`POST /uploads/presigned-url`**
- `purpose: 'deposit-proof' | 'rebuy-proof' | 'ending-stack-photo'`
- Generates a presigned PUT URL for Cloudflare R2
- Returns the upload URL (client PUTs the file) and the permanent file URL
- File path: `{purpose}/{seasonId}/{typeid}.{ext}`

**Upload Flow (Client-Side)**:
```
1. Client: POST /uploads/presigned-url → { uploadUrl, fileUrl }
2. Client: PUT <uploadUrl> with binary file data
3. Client: POST /sessions/:id/submissions with { photoUrl: fileUrl }
```

---

## 6. Real-Time Events (Pusher)

### Channel Strategy

```
Private channels (require auth):

  private-season-{seasonId}     — Season-wide events
  private-session-{sessionId}   — Session-specific events
```

### Pusher Auth Endpoint

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/pusher/auth` | JWT | `{ socket_id, channel_name }` | Pusher auth response |

The client authenticates with Pusher using this endpoint. The backend verifies the JWT and returns the Pusher channel auth token.

### Events

#### Season Channel: `private-season-{seasonId}`

| Event | Triggered By | Payload |
|-------|-------------|---------|
| `season-updated` | Season create/start/end, deposit review | `{ season: Season, members: SeasonMember[] }` |

#### Session Channel: `private-session-{sessionId}`

| Event | Triggered By | Payload |
|-------|-------------|---------|
| `session-state-changed` | State transitions | `{ session: Session }` |
| `participant-updated` | Check-in, confirm, dispute, remove, guest add | `{ action, participant: SessionParticipant, injection?: SessionInjection }` |
| `injection-updated` | Rebuy request, approve, reject | `{ action, injection: SessionInjection }` |
| `submission-updated` | Submit ending, validate, reject | `{ action, submission: EndingSubmission }` |

### Client Integration

```typescript
// Client subscribes when viewing a session
const channel = pusher.subscribe(`private-session-${sessionId}`);

channel.bind('participant-updated', (data) => {
  // Update local participants list
});

channel.bind('injection-updated', (data) => {
  // Update local injections list
});

channel.bind('session-state-changed', (data) => {
  // Update session state, trigger UI transition
});
```

### Pusher Server-Side (NestJS)

```typescript
@Injectable()
export class RealtimeService {
  private pusher: Pusher;

  constructor(private config: ConfigService) {
    this.pusher = new Pusher({
      appId: config.get('PUSHER_APP_ID'),
      key: config.get('PUSHER_KEY'),
      secret: config.get('PUSHER_SECRET'),
      cluster: config.get('PUSHER_CLUSTER'),
      useTLS: true,
    });
  }

  async triggerSessionEvent(sessionId: string, event: string, data: any) {
    await this.pusher.trigger(`private-session-${sessionId}`, event, data);
  }

  async triggerSeasonEvent(seasonId: string, event: string, data: any) {
    await this.pusher.trigger(`private-season-${seasonId}`, event, data);
  }
}
```

---

## 7. Push Notifications (Expo)

### Registration

On app startup, the client calls `PUT /users/me/push-token` with its Expo push token. The backend stores this in `users.push_token`.

### Dispatch

When an event requires a push notification, the `NotificationsService`:

1. Creates an in-app `notifications` row
2. Looks up the target user's `push_token`
3. Sends via Expo Push API if token exists

```typescript
@Injectable()
export class ExpoPushService {
  private expo = new Expo();

  async send(pushToken: string, title: string, body: string, data?: Record<string, any>) {
    if (!Expo.isExpoPushToken(pushToken)) return;

    await this.expo.sendPushNotificationsAsync([{
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    }]);
  }

  async sendBatch(messages: ExpoPushMessage[]) {
    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await this.expo.sendPushNotificationsAsync(chunk);
    }
  }
}
```

### Notification Events → Push Messages

| Event | Recipients | Push Title | Push Body |
|-------|-----------|------------|-----------|
| `deposit_submitted` | Treasurer | "Nuevo Depósito" | "{name} envió comprobante de depósito" |
| `deposit_approved` | Member | "Depósito Aprobado" | "Tu depósito fue aprobado" |
| `deposit_rejected` | Member | "Depósito Rechazado" | "Tu depósito fue rechazado" |
| `session_scheduled` | All users | "Juego Programado" | "Nuevo juego programado por {host}" |
| `session_started` | All users | "Juego Iniciado" | "El juego ha comenzado - haz check in" |
| `rebuy_requested` | Treasurer | "Ribeye Solicitado" | "{name} solicitó un ribeye 🥩" |
| `rebuy_approved` | Requester | "Ribeye Aprobado" | "Tu ribeye 🥩 fue aprobado" |
| `rebuy_rejected` | Requester | "Ribeye Rechazado" | "Tu ribeye 🥩 fue rechazado" |
| `submission_submitted` | Treasurer | "Stack Final Enviado" | "{name} envió su stack final" |
| `submission_validated` | Participant | "Stack Validado" | "Tu stack final fue validado" |
| `submission_rejected` | Participant | "Stack Rechazado" | "Tu stack final fue rechazado" |
| `session_finalized` | All users | "Juego Finalizado" | "El juego fue finalizado" |
| `season_started` | All users | "Temporada Iniciada" | "La temporada ha comenzado" |
| `season_ended` | All users | "Temporada Finalizada" | "La temporada ha terminado" |

---

## 8. File Upload (Cloudflare R2)

### Configuration

```
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET_NAME=mrf-uploads
R2_PUBLIC_URL=https://uploads.mrf.example.com  # Custom domain or R2 public URL
```

### Presigned URL Generation

```typescript
@Injectable()
export class UploadsService {
  private s3: S3Client;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.get('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  async generatePresignedUrl(purpose: string, contentType: string): Promise<{ uploadUrl: string; fileUrl: string }> {
    const ext = contentType.split('/')[1] ?? 'jpg';
    const key = `${purpose}/${typeid('file').toString()}.${ext}`;

    const uploadUrl = await getSignedUrl(this.s3, new PutObjectCommand({
      Bucket: this.config.get('R2_BUCKET_NAME'),
      Key: key,
      ContentType: contentType,
    }), { expiresIn: 300 }); // 5 minutes

    const fileUrl = `${this.config.get('R2_PUBLIC_URL')}/${key}`;
    return { uploadUrl, fileUrl };
  }
}
```

### Client Upload Flow

```typescript
// 1. Get presigned URL
const { uploadUrl, fileUrl } = await api.getPresignedUrl({
  contentType: 'image/jpeg',
  purpose: 'ending-stack-photo',
});

// 2. Upload file directly to R2
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/jpeg' },
  body: imageBlob,
});

// 3. Use fileUrl in subsequent API call
await api.submitEndingStack({
  sessionId,
  participantId,
  endingStackCents: 85000,
  photoUrl: fileUrl,
});
```

---

## 9. Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Database (Turso)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Auth
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRY=7d

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=login@mrf.example.com

# Pusher
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
PUSHER_CLUSTER=us2

# Cloudflare R2
R2_ACCOUNT_ID=your-cf-account-id
R2_ACCESS_KEY_ID=your-r2-key
R2_SECRET_ACCESS_KEY=your-r2-secret
R2_BUCKET_NAME=mrf-uploads
R2_PUBLIC_URL=https://uploads.mrf.example.com

# Expo Push
EXPO_ACCESS_TOKEN=your-expo-token  # Optional, for authenticated push
```

---

## 10. Business Rules Summary

### Season Rules
| Rule | Enforcement |
|------|-------------|
| Only one non-ended season at a time | Service-level check on create |
| Treasurer locked once season is `active` | Guard on `PUT /seasons/:id/treasurer` |
| Minimum 2 approved members to start | Validate on `POST /seasons/:id/start` |
| Cannot end season with active session | Validate on `POST /seasons/:id/end` |

### Session Rules
| Rule | Enforcement |
|------|-------------|
| Only one non-finalized session per season | Service-level check on schedule |
| Starting stack = last ending stack (or 50000) | Computed on check-in |
| All checked-in must confirm before in_progress | Validate on move-to-in-progress |
| Minimum 2 participants for in_progress | Validate on move-to-in-progress |
| No rebuys after closing | Validate on `POST /sessions/:id/injections` |
| All validated before finalize | Validate on `POST /sessions/:id/finalize` |
| Imbalanced PnL requires override note | Validate on finalize |

### Balance Math
```
SessionPnL = endingStackCents - startingStackCents - SUM(approvedInjections.amountCents)
BalanceCheck = SUM(SessionPnL for all non-removed participants) === 0
OnFinalize: season_members.current_balance_cents = endingStackCents (members only)
```

### Permission Matrix
| Action | Admin | Treasurer | Player |
|--------|-------|-----------|--------|
| Create season | Yes | — | — |
| Edit season settings | Yes | — | — |
| Edit host order | Yes | — | — |
| Start season | — | Yes | — |
| End season | — | Yes | — |
| Schedule session | Yes | Yes | — |
| Edit session | Yes | Yes | — |
| Start dealing | Yes | Yes | — |
| Move to in_progress | Yes | Yes | — |
| End session | Yes | Yes | — |
| Finalize session | Yes | Yes | — |
| Review deposits | — | Yes | — |
| Review rebuys | Yes | Yes | — |
| Review submissions | Yes | Yes | — |
| Add guest | Yes | Yes | — |
| Remove participant | Yes | Yes | — |
| Check in | — | — | Yes (self) |
| Confirm start | — | — | Yes (self) |
| Dispute start | — | — | Yes (self) |
| Request rebuy | — | — | Yes (self) |
| Submit ending stack | — | — | Yes (self + others) |
| Upload deposit | — | — | Yes (self) |

### Photo Requirements
| Upload | Required | Stored In |
|--------|----------|-----------|
| Deposit proof | Yes | `season_deposit_submissions.photo_url` |
| Rebuy proof | Optional | `session_injections.proof_photo_url` |
| Ending stack photo | Yes | `ending_submissions.photo_url` |

---

## 11. Error Handling

### Standard Error Response

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Descriptive error message"
}
```

### Common Error Codes

| Status | When |
|--------|------|
| 400 | Validation failure, business rule violation |
| 401 | Missing or invalid JWT |
| 403 | Insufficient permissions (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (e.g., season already exists, already checked in) |

### Validation

Use NestJS `class-validator` + `class-transformer` for DTO validation:

```typescript
class ScheduleSessionDto {
  @IsString()
  @IsNotEmpty()
  seasonId: string;

  @IsString()
  @IsNotEmpty()
  hostUserId: string;

  @IsOptional()
  @IsString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
```

---

## 12. Deployment (Fly.io)

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### fly.toml

```toml
app = "mrf-backend"
primary_region = "dfw"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false   # Keep alive for Pusher triggers
  auto_start_machines = true
  min_machines_running = 1

[env]
  NODE_ENV = "production"
  PORT = "3000"
```

### Secrets (via `fly secrets set`)

All env vars from §9 are set as Fly secrets.

---

## 13. Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| Unit | Vitest | Service logic: PnL math, state transitions, permission checks |
| Integration | Vitest + in-memory libSQL | Full endpoint flows with real DB |
| E2E | Supertest | Complete API flows (schedule → deal → play → close → finalize) |

### Critical Test Scenarios

1. **Full session lifecycle**: schedule → deal → check-in all → confirm → move to in_progress → rebuy → end → submit endings → finalize → verify season balances updated
2. **Balance check**: finalize with balanced PnL (no override needed)
3. **Imbalanced PnL**: finalize requires override note
4. **Permission enforcement**: player cannot approve rebuys, non-admin cannot create season
5. **State transition guards**: cannot rebuy in closing, cannot check in in in_progress
6. **Guest lifecycle**: add guest in dealing, auto-injection, ending submission, guest not persisted to season
7. **Deposit flow**: submit → approve → member balance set to 50000
8. **Concurrent safety**: two users check in simultaneously (no duplicate participants)

---

## 14. Migration Path from Mock API

The frontend's `ApiClient` interface in `services/api/types.ts` defines the contract. The backend must implement endpoints that match these request/response shapes. The client will be updated to:

1. Replace mock implementation with HTTP calls (fetch/axios)
2. Add JWT token to Authorization header
3. Replace mock file handling with presigned URL upload flow
4. Connect Pusher client for real-time updates
5. Register Expo push token on login

The mock client's method names map 1:1 to backend endpoints — the API surface was designed with this transition in mind.
