---
name: test-flow
description: Write integration or E2E tests for session lifecycle flows, business rules, and permission checks. Use when adding test coverage.
context: fork
agent: general-purpose
---

# Write Test Flow

You are writing tests for the MRF Backend. Tests verify business rules, state transitions, permissions, and data integrity.

## Before starting

1. **Read existing tests**: Check `test/` directory and `*.spec.ts` files for conventions.
2. **Read the spec**: Check `docs/backend-spec.md` for expected behavior.
3. **Identify test type**: Unit (isolated logic), Integration (DB + service), or E2E (full HTTP flow).

## Clarification-first rule

Before writing tests, ask the USER:
- Which flow or feature should be tested?
- Unit, integration, or E2E level?
- Are there specific edge cases to cover?
- Should mocks be used for external services (Pusher, Resend, R2)?

## Test types

### Unit tests (`*.spec.ts`)

Co-located next to the file being tested. Test isolated logic — no DB, no HTTP.

```typescript
// sessions.service.spec.ts
describe('SessionsService', () => {
  describe('computePnL', () => {
    it('calculates PnL correctly', () => {
      const result = computePnL({
        endingStackCents: 85000,
        startingStackCents: 50000,
        approvedInjectionsCents: 25000,
      });
      expect(result).toBe(10000); // Won $100
    });

    it('returns negative PnL for losses', () => {
      const result = computePnL({
        endingStackCents: 30000,
        startingStackCents: 50000,
        approvedInjectionsCents: 0,
      });
      expect(result).toBe(-20000); // Lost $200
    });
  });
});
```

### Integration tests (`test/*.integration.spec.ts`)

Use real DB (in-memory libSQL). Test service + DB interaction.

```typescript
// test/sessions.integration.spec.ts
describe('Sessions Integration', () => {
  let db: LibSQLDatabase;
  let sessionsService: SessionsService;

  beforeEach(async () => {
    // Set up in-memory database
    // Run migrations
    // Seed test data
    // Create service with real DB
  });

  afterEach(async () => {
    // Clean up
  });

  it('transitions session from scheduled to dealing', async () => {
    const session = await createTestSession(db, { state: 'scheduled' });
    const result = await sessionsService.startDealing(session.id, adminUser);
    expect(result.state).toBe('dealing');
    expect(result.startedAt).toBeDefined();
  });

  it('rejects transition from wrong state', async () => {
    const session = await createTestSession(db, { state: 'in_progress' });
    await expect(
      sessionsService.startDealing(session.id, adminUser),
    ).rejects.toThrow(BadRequestException);
  });
});
```

### E2E tests (`test/*.e2e-spec.ts`)

Full HTTP request/response cycle using Supertest.

```typescript
// test/sessions.e2e-spec.ts
describe('Sessions E2E', () => {
  let app: INestApplication;
  let adminToken: string;
  let playerToken: string;

  beforeAll(async () => {
    // Bootstrap NestJS app with test module
    // Generate test JWT tokens
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /sessions/:id/start-dealing', () => {
    it('transitions to dealing with treasurer auth', async () => {
      const res = await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/start-dealing`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.session.state).toBe('dealing');
    });

    it('rejects with player auth', async () => {
      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/start-dealing`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);
    });

    it('rejects without auth', async () => {
      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/start-dealing`)
        .expect(401);
    });
  });
});
```

## Critical test scenarios (from spec §13)

These are the highest-priority flows to test:

### 1. Full session lifecycle
```
schedule → deal → check-in all → confirm → move to in_progress
→ rebuy → end → submit endings → finalize → verify season balances updated
```

### 2. Balance check
Finalize with balanced PnL (no override needed). Verify `SUM(PnL) === 0`.

### 3. Imbalanced PnL
Finalize requires `overrideNote`. Without it → 400 error. With it → finalize succeeds + note stored.

### 4. Permission enforcement
- Player cannot approve rebuys (403)
- Non-admin cannot create season (403)
- Non-treasurer cannot review deposits (403)

### 5. State transition guards
- Cannot rebuy in `closing` state
- Cannot check in during `in_progress`
- Cannot move to `in_progress` without confirmations

### 6. Guest lifecycle
Add guest in `dealing` → auto-injection created → ending submission → guest NOT persisted to season balances.

### 7. Deposit flow
Submit deposit → treasurer approves → member `approval_status = 'approved'` + `current_balance_cents = 50000`.

### 8. Concurrent safety
Two users check in simultaneously — no duplicate participants.

## Test helpers

Create reusable helpers in `test/helpers/`:

```typescript
// test/helpers/test-data.ts
export async function createTestSeason(db, overrides?) { ... }
export async function createTestSession(db, overrides?) { ... }
export async function createTestParticipant(db, overrides?) { ... }
export async function createTestUser(db, overrides?) { ... }

// test/helpers/test-auth.ts
export function generateTestToken(user: Partial<JwtPayload>): string { ... }
export const adminUser = { sub: 'user_test_admin', email: 'admin@test.local', isAdmin: true };
export const playerUser = { sub: 'user_test_player', email: 'player@test.local', isAdmin: false };

// test/helpers/test-mocks.ts
export const mockRealtimeService = { triggerSessionEvent: vi.fn(), triggerSeasonEvent: vi.fn() };
export const mockNotificationsService = { notify: vi.fn(), notifyAll: vi.fn() };
```

## Verification

After writing tests:
1. `npm run test` — All unit tests pass
2. `npm run test:integration` — All integration tests pass
3. `npm run test:e2e` — All E2E tests pass (if applicable)
4. Check coverage: `npm run test -- --coverage`
