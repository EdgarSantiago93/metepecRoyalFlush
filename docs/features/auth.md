# Auth — Mock Magic Link

## Purpose

Provides email-based authentication using a mock magic-link flow. Gates the main app (tabs) behind authentication and persists sessions across app restarts using `expo-secure-store`.

This is a mock implementation designed to be swapped for a real NestJS backend by implementing the `ApiClient` interface.

## Architecture

### Auth state machine

```
loading → unauthenticated → authenticated
            ↑                      ↓
            └──── logout ──────────┘
```

- **loading**: on mount, checks `expo-secure-store` for a stored token and validates it via `api.getMe()`
- **unauthenticated**: no token found or token is invalid
- **authenticated**: user object and token available in context

### Routing guards

Bidirectional redirects prevent accessing the wrong route group:

- `app/(tabs)/_layout.tsx` — redirects to `/(auth)/login` if not authenticated
- `app/(auth)/_layout.tsx` — redirects to `/(tabs)` if already authenticated
- `app/_layout.tsx` — `AuthGate` shows a loading spinner during session restore

### Token storage

| Platform | Storage |
|----------|---------|
| iOS / Android | `expo-secure-store` (encrypted keychain) |
| Web | In-memory variable (cleared on refresh, acceptable for dev) |

### Mock API

The `ApiClient` interface (`services/api/types.ts`) defines three methods:

| Method | Delay | Behavior |
|--------|-------|----------|
| `sendMagicLink(email)` | 800ms | Checks email against seed allowlist |
| `verifyMagicLink(email, code)` | 500ms | Returns session token + user |
| `getMe(token)` | 300ms | Resolves user from token |

Mock tokens embed the email (`mock-session-<email>-<timestamp>`) so `getMe` can resolve users even after app restart when the in-memory token map is lost.

## Usage

### Login flow

1. User enters email on login screen
2. Presses "Send login link" → calls `api.sendMagicLink`
3. If not allowlisted → shows "Email not found in allowlist"
4. If allowlisted → navigates to verify screen
5. Verify screen auto-verifies after 2s (simulates clicking magic link)
6. On success → auth state becomes `authenticated` → routed to tabs

### Using auth in components

```tsx
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const auth = useAuth();

  if (auth.status === 'authenticated') {
    // auth.user is available
    console.log(auth.user.displayName);
  }

  // auth.logout() to sign out
  // auth.sendMagicLink(email) to start login
  // auth.verifyMagicLink(email, code) to complete login
}
```

### Swapping for real API

1. Implement the `ApiClient` interface from `services/api/types.ts`
2. Export it as `api` from `services/api/client.ts`
3. No other changes needed — auth service and context consume the interface

## Seed data

10 pre-populated users in `data/seed-users.ts` with `@poker.local` emails. Edgar Santiago is the admin.

## Files

| File | Purpose |
|------|---------|
| `data/seed-users.ts` | Seed user records |
| `services/api/types.ts` | `ApiClient` interface |
| `services/api/client.ts` | Mock API implementation |
| `services/auth/token-storage.ts` | Platform-aware token persistence |
| `services/auth/auth-service.ts` | High-level auth operations |
| `contexts/auth-context.tsx` | React Context + Provider |
| `hooks/use-auth.ts` | Convenience hook |
| `app/(auth)/_layout.tsx` | Auth stack layout with redirect guard |
| `app/(auth)/login.tsx` | Email input screen |
| `app/(auth)/verify.tsx` | Auto-verify screen |
