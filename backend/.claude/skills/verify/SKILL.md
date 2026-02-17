---
name: verify
description: Run the backend's verification commands (lint/typecheck/tests) and report results.
disable-model-invocation: true
allowed-tools: Bash, Read
---

Run the verification commands defined in CLAUDE.md for this repo.
- If any command fails, stop and show the failure output + likely fixes.
- If all pass, summarize what was run and confirm clean status.

## Stack

- NestJS (TypeScript)
- Drizzle ORM + Turso (libSQL)
- Vitest for testing

## Standard verification

Run these commands in order:

1. `npm run lint` — ESLint checks
2. `npm run typecheck` — TypeScript type checking
3. `npm run test` — Unit tests
4. `npm run test:integration` — Integration tests (if configured)

## Quick verification (lint + typecheck only)

If the user requests a quick check:
1. `npm run lint`
2. `npm run typecheck`

## Full verification (all checks including E2E)

If the user requests a full verification:
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run test:integration`
5. `npm run test:e2e`

## Migration verification

When schema changes are involved, also run:
1. `npx drizzle-kit generate` — Ensure migrations are generated
2. `npx drizzle-kit migrate` — Apply migrations cleanly

## API testing

When API endpoints are changed, verify with curl:
```bash
# Health check
curl -s http://localhost:3000/health | jq

# Auth flow
curl -s -X POST http://localhost:3000/auth/magic-link -H 'Content-Type: application/json' -d '{"email":"edgar@poker.local"}' | jq

# Authenticated request
curl -s http://localhost:3000/auth/me -H 'Authorization: Bearer <token>' | jq
```
