import type { Season, SeasonMember, Session } from '@/types';
import { SEED_USERS } from './seed-users';

// ---------------------------------------------------------------------------
// Mutable in-memory mock store
// ---------------------------------------------------------------------------

export type MockStore = {
  season: Season | null;
  members: SeasonMember[];
  session: Session | null;
};

export const mockStore: MockStore = {
  season: null,
  members: [],
  session: null,
};

// ---------------------------------------------------------------------------
// Dev preset factories
// ---------------------------------------------------------------------------

export type PresetKey =
  | 'no_season'
  | 'season_setup'
  | 'season_active_no_session'
  | 'season_active_with_session'
  | 'season_ended';

const NOW = '2026-02-13T12:00:00.000Z';

function makeMembers(seasonId: string, approved: boolean): SeasonMember[] {
  return SEED_USERS.map((u, i) => ({
    id: `01SM000000000000000000${String(i + 1).padStart(4, '0')}`,
    seasonId,
    userId: u.id,
    approvalStatus: approved ? 'approved' : 'not_submitted',
    currentBalanceCents: approved ? 50000 : 0, // 500 MXN
    approvedAt: approved ? NOW : null,
    approvedByUserId: approved ? SEED_USERS[0].id : null,
    rejectionNote: null,
    createdAt: NOW,
  }));
}

const PRESETS: Record<PresetKey, () => MockStore> = {
  no_season: () => ({
    season: null,
    members: [],
    session: null,
  }),

  season_setup: () => {
    const seasonId = '01SE0000000000000000000001';
    return {
      season: {
        id: seasonId,
        name: 'Season Feb 2026',
        status: 'setup',
        createdByUserId: SEED_USERS[0].id,
        treasurerUserId: SEED_USERS[1].id,
        createdAt: NOW,
        startedAt: null,
        endedAt: null,
      },
      members: makeMembers(seasonId, false),
      session: null,
    };
  },

  season_active_no_session: () => {
    const seasonId = '01SE0000000000000000000002';
    return {
      season: {
        id: seasonId,
        name: 'Season Feb 2026',
        status: 'active',
        createdByUserId: SEED_USERS[0].id,
        treasurerUserId: SEED_USERS[1].id,
        createdAt: NOW,
        startedAt: NOW,
        endedAt: null,
      },
      members: makeMembers(seasonId, true),
      session: null,
    };
  },

  season_active_with_session: () => {
    const seasonId = '01SE0000000000000000000003';
    return {
      season: {
        id: seasonId,
        name: 'Season Feb 2026',
        status: 'active',
        createdByUserId: SEED_USERS[0].id,
        treasurerUserId: SEED_USERS[1].id,
        createdAt: NOW,
        startedAt: NOW,
        endedAt: null,
      },
      members: makeMembers(seasonId, true),
      session: {
        id: '01SS0000000000000000000001',
        seasonId,
        state: 'in_progress',
        hostUserId: SEED_USERS[2].id,
        scheduledFor: NOW,
        location: "Miguel's place",
        scheduledAt: NOW,
        scheduledByUserId: SEED_USERS[1].id,
        startedAt: NOW,
        startedByUserId: SEED_USERS[1].id,
        endedAt: null,
        endedByUserId: null,
        finalizedAt: null,
        finalizedByUserId: null,
      },
    };
  },

  season_ended: () => {
    const seasonId = '01SE0000000000000000000004';
    return {
      season: {
        id: seasonId,
        name: 'Season Jan 2026',
        status: 'ended',
        createdByUserId: SEED_USERS[0].id,
        treasurerUserId: SEED_USERS[1].id,
        createdAt: '2026-01-01T00:00:00.000Z',
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: NOW,
      },
      members: makeMembers(seasonId, true),
      session: null,
    };
  },
};

export function applyPreset(key: PresetKey): void {
  const data = PRESETS[key]();
  mockStore.season = data.season;
  mockStore.members = data.members;
  mockStore.session = data.session;
}
