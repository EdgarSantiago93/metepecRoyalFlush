# Season Setup Flow

## Purpose

Implements the full season setup experience after an admin creates a season. Members upload deposit proof, the treasurer reviews and approves/rejects deposits, the admin configures host order via drag-and-drop, and the treasurer starts the season once enough members are approved.

## Roles & Permissions

| Role | Actions |
|------|---------|
| **Admin** (Edgar) | Edit host order, change treasurer via season settings |
| **Treasurer** (Carlos) | Review deposits (approve/reject), start season |
| **Member** (everyone) | Upload deposit proof, view dashboard status |

Edgar = admin only, Carlos = treasurer. Strict separation of roles.

## Routing

The Season tab uses a nested stack inside `app/(tabs)/index/`:

| Screen | Path | Purpose |
|--------|------|---------|
| Dashboard | `index` | Season state router (setup, active, ended) |
| Deposit Upload | `deposit-upload` | Player uploads deposit proof photo |
| Deposit Approvals | `deposit-approvals` | Treasurer reviews all deposits |
| Host Order | `host-order` | Admin drag-and-drop reorder |
| Season Settings | `season-settings` | Admin changes treasurer |

## Dashboard Sections

1. **Header** — Season name, "Setup" badge, treasurer name
2. **Progress card** — Approved count with progress bar
3. **Start Season** (treasurer only) — Enabled when 2+ approved members
4. **Action buttons** — Role-based: upload deposit, review deposits, edit host order, season settings
5. **Deposit Status List** — All members with status badges
6. **Host Order Preview** — Numbered list, "Edit" link for admin

## API Methods

| Method | Description |
|--------|-------------|
| `submitDeposit` | Player submits photo + optional note |
| `getDepositSubmissions` | Fetch all submissions for a season |
| `reviewDeposit` | Treasurer approves/rejects with optional note |
| `getHostOrder` | Get current host order |
| `saveHostOrder` | Save reordered host list |
| `updateTreasurer` | Admin changes treasurer (setup only) |
| `startSeason` | Treasurer starts season (requires 2+ approved) |

## Dev Testing

Use the dev toggle in Profile tab:
- **Season Setup** — Clean slate, all members `not_submitted`
- **Setup (mixed)** — 2 approved, 2 pending, 1 rejected, 5 not submitted

Test as different users:
- `edgar@poker.local` — Admin actions (host order, settings)
- `carlos@poker.local` — Treasurer actions (review deposits, start season)
- `miguel@poker.local` — Member actions (upload deposit proof)

## Dependencies

- `expo-image-picker` — Camera/library photo selection
- `react-native-reanimated-dnd` — Drag-and-drop sortable list for host order
