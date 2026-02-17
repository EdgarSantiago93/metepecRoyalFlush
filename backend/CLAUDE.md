# Claude Code — MRF Backend (NestJS)

## Role

You are the orchestrator. You lead with Plan → Execute → Verify and use skills for repeatable workflows.

## Objective

Deliver small, safe, reviewable changes with strong verification and a clean PR.

## Hard stop rule (must-follow)

After creating a PR, STOP.

- Do not merge
- Do not rebase main into the branch unless explicitly asked
- Do not close the PR
  Wait for the user to review and request changes.

## Project overview

The production backend for **Metepec Royal Flush** — a private poker group ledger app.
Serves the Expo mobile frontend via REST API, handles authentication (passwordless magic links), real-time events (Pusher), push notifications (Expo Push), file uploads (Cloudflare R2), and enforces all business rules for seasons, sessions, and the ledger.

### Tech stack

| Concern | Choice |
|---------|--------|
| **Framework** | NestJS (TypeScript, modular, decorator-based) |
| **Database** | Turso (libSQL) — managed SQLite at the edge |
| **ORM** | Drizzle ORM — type-safe, lightweight, native libSQL driver |
| **Auth** | Passwordless magic links via Resend → JWT (7-day expiry) |
| **File Storage** | Cloudflare R2 — S3-compatible, presigned URLs |
| **Real-time** | Pusher Channels — WebSocket push for live session events |
| **Push Notifications** | Expo Push Notifications |
| **IDs** | TypeID — type-prefixed, K-sortable UUIDv7 (`user_01h...`, `ses_01h...`) |
| **Deployment** | Fly.io — single-region, persistent process |
| **Validation** | class-validator + class-transformer for DTOs |
| **Testing** | Vitest (unit + integration), Supertest (E2E) |

### Key domain concepts

- **Season** — setup → active → ended; one active at a time
- **Session** — a game night; scheduled → dealing → in_progress → closing → finalized
- **Treasurer** — approves deposits, rebuys, validates ending submissions, finalizes sessions
- **Admin** — creates seasons, manages host order, overrides session actions
- **Player** — checks in, confirms starting stack, requests rebuys, submits ending stack + photo
- **Guest** — single-session participant, no season persistence
- **Ledger** — read-only truth view of season balances and finalized session history

### Core math

- `SessionPnL = endingStackCents - startingStackCents - SUM(approvedInjections.amountCents)`
- Balancing invariant: `SUM(SessionPnL for all non-removed participants) === 0`
- On finalize: `season_members.current_balance_cents = endingStackCents` (members only)
- Money stored as INTEGER (MXN cents), IDs as TypeID TEXT

### TypeID prefixes

| Model | Prefix | Example |
|-------|--------|---------|
| `users` | `user` | `user_01h455vb4pex5vsknk084sn02q` |
| `magic_links` | `mlink` | `mlink_01h455vb4p...` |
| `seasons` | `sea` | `sea_01h455vb4p...` |
| `season_members` | `smem` | `smem_01h455vb4p...` |
| `season_deposit_submissions` | `dep` | `dep_01h455vb4p...` |
| `season_host_order` | `hord` | `hord_01h455vb4p...` |
| `sessions` | `ses` | `ses_01h455vb4p...` |
| `session_participants` | `part` | `part_01h455vb4p...` |
| `session_injections` | `inj` | `inj_01h455vb4p...` |
| `ending_submissions` | `esub` | `esub_01h455vb4p...` |
| `session_finalize_notes` | `fnote` | `fnote_01h455vb4p...` |
| `notifications` | `notif` | `notif_01h455vb4p...` |

## Context map (read when needed)

- `docs/backend-spec.md` — Full backend specification (stack, schema, API, events, auth, deployment)
- `docs/project.md` — Product goals, roles, permissions, season/session model overview
- `docs/datamodels.md` — v1 data model, all tables, fields, constraints, derived computations
- `docs/season.md` — Season flow: states, UI, validations, permissions, edge cases
- `docs/session.md` — Session flow: state machine, dealing, rebuys, closing, finalize
- `docs/ledger.md` — Ledger screens: balances, session history, finalized detail
- `.claude/skills/api-endpoint` — Creating new controller + service + DTO + tests
- `.claude/skills/db-migration` — Drizzle schema changes and migrations
- `.claude/skills/realtime-event` — Adding Pusher real-time events + notifications
- `.claude/skills/test-flow` — Writing integration/E2E tests for lifecycle flows
- `.claude/skills/problem-solver` — Orchestrates ambiguous/complex tasks with research
- `.claude/skills/verify` — Run lint/typecheck/tests and report results

## Project structure

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/          # auth.guard.ts, roles.guard.ts
│   ├── decorators/      # @CurrentUser(), @Roles()
│   ├── interceptors/    # transform.interceptor.ts
│   ├── filters/         # http-exception.filter.ts
│   ├── pipes/           # typeid-validation.pipe.ts
│   └── utils/           # typeid.ts, money.ts
├── config/              # env.ts (Zod-validated)
├── db/
│   ├── schema/          # Drizzle table definitions
│   ├── migrations/      # Drizzle migration files
│   ├── seed.ts          # Initial user seed
│   ├── drizzle.module.ts
│   └── drizzle.config.ts
├── auth/                # Magic link + JWT
├── users/               # User CRUD + push token
├── seasons/             # Season lifecycle + deposits + host order
│   ├── deposits/
│   └── host-order/
├── sessions/            # Session lifecycle
│   ├── participants/
│   ├── injections/      # Rebuys
│   ├── submissions/     # Ending stack submissions
│   └── finalization/
├── ledger/              # Read-only ledger endpoints
├── notifications/       # In-app + Expo push
├── realtime/            # Pusher trigger wrapper
└── uploads/             # R2 presigned URL generation
```

## Process (always)

1. **PLAN**: Restate the goal, list assumptions, identify impacted modules/files.
2. **EXECUTE**: Implement in small steps. Write tests first (TDD). Minimal unrelated changes.
3. **VERIFY**: Run checks and fix failures.
4. **DOCUMENT**: Add or update documentation for the feature/change.
5. **DELIVER**: Create PR with template filled.
6. **STOP**.

## Verification commands

- Install: `npm i`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit tests: `npm run test`
- Integration tests: `npm run test:integration`
- E2E tests: `npm run test:e2e`
- All: `npm run verify` (runs lint + typecheck + test in sequence)

## Coding conventions

### NestJS patterns

- One module per domain entity (seasons, sessions, etc.)
- Controllers handle HTTP concerns only — delegate all logic to services
- Services contain business logic and database operations
- DTOs use `class-validator` decorators for input validation
- Guards for auth (`AuthGuard`) and role checks (`RolesGuard`)
- Custom decorators: `@CurrentUser()` for extracting user from JWT, `@Roles()` for permission
- Interceptors for response transformation
- Exception filters for consistent error formatting

### Database

- All IDs are TypeID (type-prefixed UUIDv7), stored as TEXT
- All money values are INTEGER in MXN cents (e.g., 50000 = $500 MXN)
- All timestamps are ISO 8601 strings stored as TEXT
- Use Drizzle's query builder — no raw SQL unless absolutely necessary
- Schema definitions in `src/db/schema/`
- Migrations via `drizzle-kit generate` then `drizzle-kit migrate`

### Error handling

- Return structured errors: `{ statusCode, error, message }`
- 400 for validation/business rule failures
- 401 for missing/invalid JWT
- 403 for insufficient permissions
- 404 for resource not found
- 409 for conflicts (duplicate season, already checked in, etc.)

### Testing

- Co-locate unit tests: `*.spec.ts` next to the file being tested
- Integration tests in `test/` directory: `*.integration.spec.ts`
- E2E tests in `test/` directory: `*.e2e-spec.ts`
- Use in-memory libSQL for integration tests
- Mock Pusher, Resend, and R2 in tests
- Test business rules thoroughly: state transitions, permission checks, PnL math

### Naming

- Files: kebab-case (`session-participants.controller.ts`)
- Classes: PascalCase (`SessionParticipantsController`)
- Methods: camelCase (`moveToInProgress`)
- DTOs: PascalCase with `Dto` suffix (`ScheduleSessionDto`)
- Database columns: snake_case (Drizzle handles mapping)
- API paths: kebab-case (`/sessions/:id/start-dealing`)

## Business rules (quick reference)

### Season rules
- Only one non-ended season at a time
- Treasurer locked once season is `active`
- Minimum 2 approved members to start
- Cannot end season with active (non-finalized) session

### Session rules
- Only one non-finalized session per season
- Starting stack = last ending stack (or 50000 for first session)
- All checked-in must confirm before `in_progress`
- Minimum 2 participants for `in_progress`
- No rebuys after `closing`
- All submissions validated before finalize
- Imbalanced PnL requires override note

### Permission matrix (quick ref)

| Action | Admin | Treasurer | Player |
|--------|-------|-----------|--------|
| Create/edit season | Yes | — | — |
| Start/end season | — | Yes | — |
| Schedule/edit/transition session | Yes | Yes | — |
| Review deposits | — | Yes | — |
| Review rebuys/submissions | Yes | Yes | — |
| Add guest / remove participant | Yes | Yes | — |
| Check in / confirm / dispute | — | — | Self |
| Request rebuy | — | — | Self |
| Submit ending stack | — | — | Self + others |

## Real-time events (Pusher)

### Channels
- `private-season-{seasonId}` — season-wide events
- `private-session-{sessionId}` — session-specific events

### Events
| Channel | Event | Trigger |
|---------|-------|---------|
| Season | `season-updated` | Season create/start/end, deposit review |
| Session | `session-state-changed` | State transitions |
| Session | `participant-updated` | Check-in, confirm, dispute, remove, guest add |
| Session | `injection-updated` | Rebuy request, approve, reject |
| Session | `submission-updated` | Submit ending, validate, reject |

## Environment variables

See `docs/backend-spec.md` §9 for the full list. Key groups:
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` — Database
- `JWT_SECRET`, `JWT_EXPIRY` — Auth
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — Email
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` — Real-time
- `R2_*` — File storage
- `EXPO_ACCESS_TOKEN` — Push notifications

## Documentation

### When to document
- New endpoints or modules
- New business rules or validations
- Schema changes
- Configuration changes

### Where to document
- `docs/features/<feature-name>.md` — Feature docs (purpose, usage, API, examples)
- `docs/backend-spec.md` — Update if API surface or schema changes
- `README.md` — Update if setup/deployment steps change

## Git & PR workflow

### Before starting work

1. `git checkout main`
2. `git pull origin main`
3. `git checkout -b feature/<short-desc>` (or `fix/<short-desc>`, `chore/<short-desc>`)

### During work

- Keep commits small and meaningful
- Never push to `main`

### When done

1. Push the branch: `git push -u origin HEAD`
2. Create the PR with `gh pr create`:
   - Fill summary, how to test, and risk
   - Include curl examples or test output for API changes
3. **STOP.** Do not merge, rebase, or close the PR. Wait for the user to review.

PR feedback is applied via commits on the branch; never merge.
