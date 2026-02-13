# Claude Code — Poker Season Ledger App

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

A private mobile app for a single poker group that replaces the Excel ledger and WhatsApp deposit-proof flow.
Tracks **season-based balances** across sessions, handles **treasurer approvals** (deposits + rebuys), requires **photo proof** for end-of-session chip counts, and enforces **ledger integrity** via balancing checks and audit notes.

### Key domain concepts

- **Season** — a time-bounded period with one active season at a time (setup → active → ended)
- **Session** — a single game night within a season (scheduled → dealing → in_progress → closing → finalized)
- **Treasurer** — approves deposits, rebuys, validates ending submissions, finalizes sessions
- **Admin** — creates seasons, manages host order, overrides session actions
- **Player** — checks in, confirms starting stack, requests rebuys, submits ending stack + photo
- **Guest** — single-session participant (on-ledger or off-ledger), no season persistence
- **Ledger** — read-only truth view of season balances and finalized session history

### Core math

- `SessionPnL = EndingStack - StartingStack - Sum(ApprovedInjections)`
- Balancing invariant: `Sum(SessionPnL for all participants) == 0`
- On finalize: `SeasonBalance = EndingStack` for each member
- Money stored as INTEGER (MXN whole pesos), IDs as ULIDs

## Context map (read when needed)

- docs/project.md — product goals, roles, permissions, season/session model overview
- docs/datamodels.md — v1 data model (SQLite/Turso), all tables, fields, constraints, derived computations
- docs/season.md — season flow screen-by-screen: states, UI, validations, permissions, edge cases
- docs/session.md — session flow screen-by-screen: state machine, dealing, rebuys, closing, finalize
- docs/screens.md — v1 screen map (mobile-first), navigation, all screens by section
- docs/ledger.md — ledger screens: balances table, session history, finalized session detail, player detail
- docs/STYLES.md — UI/styling conventions + accessibility checklist (when created)
- .claude/skills/problem-solver — orchestrates ambiguous / complex tasks with clarification + research

## Process (always)

1. PLAN: Restate the goal, list assumptions, identify impacted areas/files.
2. EXECUTE: Implement in small steps with minimal unrelated changes, always design tests for whatever you are implementing, think of TDD
3. VERIFY: Run checks and fix failures.
4. DOCUMENT: Add or update documentation for the feature/change (see Documentation section).
5. DELIVER: Create PR with template filled + screenshots if UI changed.
6. STOP.

## Verification commands

- Install: npm i
- Lint: npm run lint
- Typecheck: npm run typecheck
- Unit tests: npm run test:run
- (Optional) E2E: npm run test:e2e

## UI Verification

Since this is a React Native / Expo app, UI verification uses the Expo dev server:

1. Ensure Expo dev server is running: `npx expo start`
2. For web preview (NativeWind supports web): open `http://localhost:8081` in browser
3. Use Playwright MCP tools for browser-based verification on web target:
   - Navigate: `browser_navigate` → `http://localhost:8081`
   - Inspect: `browser_snapshot` → Get current page state
   - Interact: `browser_click`, `browser_type`, `browser_fill_form`
   - Capture screenshots: `browser_take_screenshot` → `.github/pr-screenshots/<feature>-<state>.png`
   - Check errors: `browser_console_messages` with level: error
   - Clean up: `browser_close`
4. For native-only features, describe manual test steps for iOS Simulator / Android Emulator

When UI behavior changes, provide:

- screenshots (empty, filled, error state)
- "How to test" steps

## Documentation

Before creating a PR, add or update documentation for the feature/change:

### When to document
- New features or components
- New utilities, hooks, or patterns
- API changes or new endpoints
- Configuration changes
- Workflow changes (like new skills)

### Where to document
- **`docs/features/`** — Feature documentation (how to use, examples, API)
- **`docs/PROJECT.md`** — Update if domain concepts change
- **`docs/STYLES.md`** — Update if UI/styling patterns change

### Documentation format
Create markdown files in `docs/features/` with:
- **Purpose**: What the feature does and why it exists
- **Usage**: How to use it with examples
- **API/Props**: If applicable, list parameters, props, or configuration options
- **Examples**: Code snippets or usage patterns

### Naming convention
- `docs/features/<feature-name>.md` (e.g., `docs/features/playwright-mcp-verification.md`)
- Use kebab-case for filenames
- Keep names descriptive but concise

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
   - Embed screenshots in PR body if UI changed
   - Commit screenshots to `.github/pr-screenshots/` on the branch
3. **STOP.** Do not merge, rebase, or close the PR. Wait for the user to review.

PR feedback is applied via commits on the branch; never merge.
