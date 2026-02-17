---
name: api-endpoint
description: Create a new NestJS API endpoint with controller, service, DTO, and tests. Use for adding or modifying REST endpoints.
context: fork
agent: general-purpose
---

# Create API Endpoint

You are building a new API endpoint for the MRF Backend (NestJS + Drizzle + Turso).

## Before starting

1. **Read the spec**: Check `docs/backend-spec.md` for the endpoint definition (method, path, auth, roles, body, response).
2. **Identify the module**: Determine which NestJS module this endpoint belongs to (auth, seasons, sessions, etc.).
3. **Check existing patterns**: Read at least one existing controller + service pair in the same module to match conventions.

## Clarification-first rule

Before writing code, ask the USER:
- Is the endpoint already defined in `docs/backend-spec.md`, or is this a new addition?
- Any deviations from the spec?
- Should this trigger real-time events or push notifications?
- Are there edge cases beyond what the spec covers?

## Implementation checklist

### 1. DTO (Data Transfer Object)

Create in the module directory: `<module>/dto/<action>.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class ExampleDto {
  @IsString()
  @IsNotEmpty()
  requiredField: string;

  @IsOptional()
  @IsString()
  optionalField?: string;

  @IsInt()
  @Min(0)
  amountCents: number;
}
```

### 2. Controller

Add to the module's controller: `<module>/<module>.controller.ts`

```typescript
@Post(':id/action')
@Roles('treasurer', 'admin')
async performAction(
  @Param('id', new TypeIdPipe('ses')) id: string,
  @Body() dto: ExampleDto,
  @CurrentUser() user: JwtPayload,
) {
  return this.service.performAction(id, dto, user);
}
```

Key patterns:
- Use `@Roles()` decorator for permission enforcement
- Use `TypeIdPipe` for ID parameter validation
- Use `@CurrentUser()` to extract authenticated user
- Controller only handles HTTP concerns — delegate to service

### 3. Service

Add business logic in: `<module>/<module>.service.ts`

```typescript
async performAction(id: string, dto: ExampleDto, user: JwtPayload) {
  // 1. Fetch entity and validate existence
  // 2. Check state preconditions
  // 3. Check business rules
  // 4. Execute database operation
  // 5. Trigger real-time event (if applicable)
  // 6. Send push notification (if applicable)
  // 7. Return result
}
```

Key patterns:
- Validate state transitions (e.g., session must be `dealing` to check in)
- Use transactions for multi-table operations
- Throw `BadRequestException` for business rule violations
- Throw `ForbiddenException` for permission failures
- Throw `NotFoundException` for missing entities
- Throw `ConflictException` for duplicate operations

### 4. Tests

Create test file: `<module>/<module>.service.spec.ts` (unit) or `test/<module>.integration.spec.ts` (integration)

Test categories:
- **Happy path**: Valid input, correct state, authorized user
- **Permission denied**: Wrong role tries the action
- **State violation**: Entity in wrong state for the action
- **Validation failure**: Invalid input data
- **Business rule**: Domain-specific constraints (e.g., imbalanced PnL)
- **Idempotency**: Duplicate requests handled gracefully

### 5. Wire up

- Register DTO in controller method
- Export service from module if used by other modules
- Update module imports if new dependencies added

## Real-time events

If the endpoint should trigger a Pusher event:

```typescript
// In the service, after the database operation:
await this.realtimeService.triggerSessionEvent(
  sessionId,
  'participant-updated',
  { action: 'check-in', participant },
);
```

## Push notifications

If the endpoint should send a push notification:

```typescript
await this.notificationsService.notify(
  targetUserId,
  'rebuy_requested',
  { title: 'Ribeye Solicitado', body: `${name} solicitó un ribeye` },
);
```

## Verification

After implementation:
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. Test manually with curl or Postman if the server is running

## Response format

All responses follow: `{ statusCode: 200, data: { ... } }`
All errors follow: `{ statusCode: 4xx, error: 'Error Type', message: 'Description' }`
