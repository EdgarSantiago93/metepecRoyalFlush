---
name: verify
description: Run the repo's verification commands (lint/typecheck/tests) and report results.
disable-model-invocation: true
allowed-tools: Bash, Read, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_fill_form, mcp__playwright__browser_wait_for, mcp__playwright__browser_close, mcp__playwright__browser_console_messages
---
Run the verification commands defined in CLAUDE.md for this repo.
- If any command fails, stop and show the failure output + likely fixes.
- If all pass, summarize what was run and confirm clean status.

## Stack

- React Native + Expo (managed workflow)
- NativeWind (Tailwind CSS for React Native)
- TypeScript

## Standard Verification

Run these commands in order:
1. `npm run lint` — ESLint checks
2. `npm run typecheck` — TypeScript type checking
3. `npm run test:run` — Unit tests

## UI Verification (for UI changes)

Choose one of the following approaches:

### Option A: Expo Web Preview + Playwright MCP (recommended)

Use Expo's web target with Playwright MCP for browser-based verification:

1. Ensure Expo dev server is running: `npx expo start --web`
2. Navigate: `browser_navigate` → `http://localhost:8081`
3. Inspect: `browser_snapshot` → Get element refs
4. Interact: `browser_click`, `browser_type`, `browser_fill_form`
5. Screenshot: `browser_take_screenshot` → `.github/pr-screenshots/<feature>-<state>.png`
6. Check errors: `browser_console_messages` with level: error
7. Clean up: `browser_close`

### Option B: E2E Tests (for automated regression testing)

Run E2E tests (when configured):
```bash
npm run test:e2e
```

- Screenshots are stored in `test-results/**/*.png`
- Copy relevant screenshots to `.github/pr-screenshots/` for PR

### Option C: Manual Native Testing

For native-only features that don't render on web:
- Provide step-by-step manual test instructions
- Specify iOS Simulator / Android Emulator steps
- Include expected behavior for each step

## Screenshot Capture

When verifying UI changes, capture screenshots in these states:
- `<feature>-initial.png` — Initial/empty state
- `<feature>-filled.png` — Filled/populated state
- `<feature>-error.png` — Error state

Screenshots should be saved to `.github/pr-screenshots/` for use in PRs.
