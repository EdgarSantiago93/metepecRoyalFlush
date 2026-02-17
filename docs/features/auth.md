# Auth — Magic Link (Real Backend)

## Purpose

Provides email-based authentication via a real NestJS backend. Users receive a magic link by email, tap it to open the app via deep link, and are authenticated automatically. Sessions persist across app restarts using `expo-secure-store`.

The app uses a **hybrid client** strategy: auth methods hit the real backend while non-auth methods still use mock seed data (until those endpoints are migrated).

## Architecture

### Auth state machine

```
loading → unauthenticated → authenticated
            ↑                      ↓
            └──── logout ──────────┘
```

- **loading**: on mount, checks `expo-secure-store` for a stored token and validates it via `GET /auth/me`
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

### Backend API endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/auth/magic-link` | None | `{ email }` | `{ success, message }` |
| `POST` | `/auth/verify` | None | `{ email, code }` | `{ token, user }` |
| `GET` | `/auth/me` | JWT | — | `{ user }` |

### Hybrid client strategy

The `api` export in `services/api/client.ts` composes:

```ts
export const api: ApiClient = {
  ...httpAuth,   // real HTTP auth (3 methods)
  ...mockApi,    // mock everything else (seed data)
};
```

This allows incremental migration — swap individual mock methods for real HTTP calls as backend endpoints become available.

## Environment setup

Create `.env` at the project root (already gitignored):

```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Expo SDK 54 auto-loads `EXPO_PUBLIC_*` vars from `.env` at build time. See `.env.example` for reference.

## Deep link flow

The app scheme is `metepecroyalflush://` (configured in `app.json`).

### How it works

1. User enters email on login screen → `POST /auth/magic-link`
2. Backend sends an email containing a link: `metepecroyalflush://auth/verify?email=user@example.com&code=abc123`
3. User taps the link → Expo Router navigates to `app/(auth)/verify.tsx` with `email` and `code` as search params
4. Verify screen detects `code` is present → auto-calls `POST /auth/verify` immediately
5. On success → auth state becomes `authenticated` → routed to tabs
6. On error → shows error message with "Intentar de nuevo" button

### Manual navigation (no code param)

When navigating from the login screen (no `code` in params), the verify screen shows a "check your email" waiting UI with a spinner. The user must tap the magic link in their email to complete verification.

## Usage

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

### Error handling

The HTTP client provides user-friendly error messages:
- **Network failure**: "No se pudo conectar al servidor. Verifica tu conexión."
- **Backend error**: Passes through the NestJS `message` field (e.g., "Email not found")
- **Unknown error**: "Error del servidor (status code)"

## Files

| File | Purpose |
|------|---------|
| `.env` / `.env.example` | API URL configuration |
| `services/api/http-auth-client.ts` | Real HTTP auth client (3 methods) |
| `services/api/client.ts` | Hybrid client (real auth + mock non-auth) |
| `services/api/types.ts` | `ApiClient` interface |
| `services/auth/token-storage.ts` | Platform-aware token persistence |
| `services/auth/auth-service.ts` | High-level auth operations |
| `contexts/auth-context.tsx` | React Context + Provider |
| `hooks/use-auth.ts` | Convenience hook |
| `app/(auth)/_layout.tsx` | Auth stack layout with redirect guard |
| `app/(auth)/login.tsx` | Email input screen |
| `app/(auth)/verify.tsx` | Deep link verify screen |
