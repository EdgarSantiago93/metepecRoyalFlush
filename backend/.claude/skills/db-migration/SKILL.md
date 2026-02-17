---
name: db-migration
description: Create or modify Drizzle ORM schema and generate migrations. Use for any database schema changes.
context: fork
agent: general-purpose
---

# Database Migration

You are modifying the database schema for the MRF Backend using Drizzle ORM with Turso (libSQL/SQLite).

## Before starting

1. **Read current schema**: Check `src/db/schema/` for existing table definitions.
2. **Read the spec**: Check `docs/backend-spec.md` §4 for the target schema.
3. **Read data models**: Check `docs/datamodels.md` for field constraints and relationships.

## Clarification-first rule

Before writing code, ask the USER:
- Is this adding a new table, modifying an existing one, or both?
- Are there existing rows that need migrating?
- Should any new columns have default values for existing data?
- Does this change affect any API endpoints?

## Schema conventions

### TypeID primary keys

Every table uses TypeID as primary key, stored as TEXT:

```typescript
import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),  // TypeID: ses_01h...
  // ...
});
```

### TypeID prefixes

| Model | Prefix |
|-------|--------|
| `users` | `user` |
| `magic_links` | `mlink` |
| `seasons` | `sea` |
| `season_members` | `smem` |
| `season_deposit_submissions` | `dep` |
| `season_host_order` | `hord` |
| `sessions` | `ses` |
| `session_participants` | `part` |
| `session_injections` | `inj` |
| `ending_submissions` | `esub` |
| `session_finalize_notes` | `fnote` |
| `notifications` | `notif` |

### Data types

- **IDs**: `text('column_name')` — TypeID strings
- **Money**: `integer('column_name')` — MXN cents (e.g., 50000 = $500)
- **Timestamps**: `text('column_name')` — ISO 8601 datetime strings
- **Booleans**: `integer('column_name', { mode: 'boolean' })`
- **Enums**: `text('column_name', { enum: ['value1', 'value2'] })`
- **Optional fields**: chain `.default(value)` or leave nullable

### Foreign keys

```typescript
seasonId: text('season_id').notNull().references(() => seasons.id),
userId: text('user_id').references(() => users.id),  // nullable FK
```

### Unique constraints

```typescript
export const seasonMembers = sqliteTable('season_members', {
  // columns...
}, (t) => ({
  uniqueMember: unique().on(t.seasonId, t.userId),
}));
```

### Indexes

```typescript
// Add in a separate indexes file or inline
createIndex('idx_sessions_season').on(sessions.seasonId);
createIndex('idx_sessions_state').on(sessions.state);
```

## Implementation steps

### 1. Modify schema

Edit or create files in `src/db/schema/`:

```typescript
// src/db/schema/sessions.ts
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  seasonId: text('season_id').notNull().references(() => seasons.id),
  state: text('state', {
    enum: ['scheduled', 'dealing', 'in_progress', 'closing', 'finalized'],
  }).notNull(),
  // ... all columns
});
```

### 2. Export from barrel

Ensure `src/db/schema/index.ts` re-exports the new/modified table:

```typescript
export * from './users';
export * from './seasons';
export * from './sessions';
// etc.
```

### 3. Generate migration

```bash
npx drizzle-kit generate
```

This creates a new migration file in `src/db/migrations/`.

### 4. Review migration

Read the generated SQL migration file. Verify:
- Column types are correct
- Foreign keys reference the right tables
- Indexes are included
- Default values are set for new columns (important for existing data)

### 5. Apply migration

```bash
npx drizzle-kit migrate
```

### 6. Update seed data (if needed)

If adding a new table that needs initial data, update `src/db/seed.ts`.

### 7. Update types

If the schema change affects API types, update the relevant DTOs and response types.

## Destructive changes

For destructive changes (dropping columns, changing types), always:
1. Ask the USER for confirmation
2. Consider a multi-step migration (add new → migrate data → drop old)
3. Back up the database first if in production

## Testing

After schema changes:
1. Run migration: `npx drizzle-kit migrate`
2. Run integration tests: `npm run test:integration`
3. Verify seed still works: `npx ts-node src/db/seed.ts`

## Verification

1. `npm run typecheck` — Drizzle types should propagate
2. `npm run test` — Existing tests should still pass
3. `npx drizzle-kit studio` — Visual inspection (optional)
