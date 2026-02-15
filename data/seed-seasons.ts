import type { Season, SeasonMember, SeasonDepositSubmission, SeasonHostOrder, Session, SessionParticipant } from '@/types';
import { SEED_USERS } from './seed-users';

// ---------------------------------------------------------------------------
// Mutable in-memory mock store
// ---------------------------------------------------------------------------

export type MockStore = {
  season: Season | null;
  members: SeasonMember[];
  session: Session | null;
  depositSubmissions: SeasonDepositSubmission[];
  hostOrder: SeasonHostOrder[];
  sessionParticipants: SessionParticipant[];
};

export const mockStore: MockStore = {
  season: null,
  members: [],
  session: null,
  depositSubmissions: [],
  hostOrder: [],
  sessionParticipants: [],
};

// ---------------------------------------------------------------------------
// Dev preset factories
// ---------------------------------------------------------------------------

export type PresetKey =
  | 'no_season'
  | 'season_setup'
  | 'season_setup_mixed'
  | 'season_active_no_session'
  | 'season_active_scheduled'
  | 'season_active_dealing'
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
    approvedByUserId: approved ? SEED_USERS[1].id : null, // treasurer approves
    rejectionNote: null,
    createdAt: NOW,
  }));
}

function makeHostOrder(seasonId: string): SeasonHostOrder[] {
  return SEED_USERS.map((u, i) => ({
    id: `01SH000000000000000000${String(i + 1).padStart(4, '0')}`,
    seasonId,
    userId: u.id,
    sortIndex: i,
    updatedAt: NOW,
  }));
}

const PRESETS: Record<PresetKey, () => MockStore> = {
  no_season: () => ({
    season: null,
    members: [],
    session: null,
    depositSubmissions: [],
    hostOrder: [],
    sessionParticipants: [],
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
      depositSubmissions: [],
      hostOrder: makeHostOrder(seasonId),
      sessionParticipants: [],
    };
  },

  season_setup_mixed: () => {
    const seasonId = '01SE0000000000000000000001';
    const treasurer = SEED_USERS[1]; // Carlos

    // Mixed statuses: 0=Edgar(not_submitted admin), 1=Carlos(approved treasurer),
    // 2=Miguel(approved), 3=Andres(pending), 4=Jorge(pending),
    // 5=Luis(rejected), 6-9=not_submitted
    const statuses: Array<'not_submitted' | 'pending' | 'approved' | 'rejected'> = [
      'not_submitted', 'approved', 'approved', 'pending', 'pending',
      'rejected', 'not_submitted', 'not_submitted', 'not_submitted', 'not_submitted',
    ];

    const members: SeasonMember[] = SEED_USERS.map((u, i) => ({
      id: `01SM000000000000000000${String(i + 1).padStart(4, '0')}`,
      seasonId,
      userId: u.id,
      approvalStatus: statuses[i],
      currentBalanceCents: statuses[i] === 'approved' ? 50000 : 0,
      approvedAt: statuses[i] === 'approved' ? NOW : null,
      approvedByUserId: statuses[i] === 'approved' ? treasurer.id : null,
      rejectionNote: statuses[i] === 'rejected' ? 'Photo is blurry, please resubmit' : null,
      createdAt: NOW,
    }));

    const depositSubmissions: SeasonDepositSubmission[] = [];

    // Create submissions for approved, pending, and rejected members
    statuses.forEach((status, i) => {
      if (status === 'not_submitted') return;
      depositSubmissions.push({
        id: `01SD000000000000000000${String(i + 1).padStart(4, '0')}`,
        seasonId,
        userId: SEED_USERS[i].id,
        photoUrl: `https://placeholder.mock/deposit-${i + 1}.jpg`,
        note: i === 3 ? 'Transferencia SPEI' : null,
        status: status as 'pending' | 'approved' | 'rejected',
        reviewedAt: status === 'approved' || status === 'rejected' ? NOW : null,
        reviewedByUserId: status === 'approved' || status === 'rejected' ? treasurer.id : null,
        reviewNote: status === 'rejected' ? 'Photo is blurry, please resubmit' : null,
        createdAt: NOW,
      });
    });

    // Shuffled host order for testing
    const shuffled = [...SEED_USERS].sort(() => Math.random() - 0.5);
    const hostOrder: SeasonHostOrder[] = shuffled.map((u, i) => ({
      id: `01SH000000000000000000${String(i + 1).padStart(4, '0')}`,
      seasonId,
      userId: u.id,
      sortIndex: i,
      updatedAt: NOW,
    }));

    return {
      season: {
        id: seasonId,
        name: 'Season Feb 2026',
        status: 'setup',
        createdByUserId: SEED_USERS[0].id,
        treasurerUserId: treasurer.id,
        createdAt: NOW,
        startedAt: null,
        endedAt: null,
      },
      members,
      session: null,
      depositSubmissions,
      hostOrder,
      sessionParticipants: [],
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
      depositSubmissions: [],
      hostOrder: makeHostOrder(seasonId),
      sessionParticipants: [],
    };
  },

  season_active_scheduled: () => {
    const seasonId = '01SE0000000000000000000005';
    return {
      season: {
        id: seasonId,
        name: 'Season Feb 2026',
        status: 'active' as const,
        createdByUserId: SEED_USERS[0].id,
        treasurerUserId: SEED_USERS[1].id, // Carlos
        createdAt: NOW,
        startedAt: NOW,
        endedAt: null,
      },
      members: makeMembers(seasonId, true),
      session: {
        id: '01SS0000000000000000000002',
        seasonId,
        state: 'scheduled' as const,
        hostUserId: SEED_USERS[2].id, // Miguel
        scheduledFor: '2026-02-15T20:00:00.000Z',
        location: "Miguel's place",
        scheduledAt: NOW,
        scheduledByUserId: SEED_USERS[1].id, // Carlos scheduled it
        startedAt: null,
        startedByUserId: null,
        endedAt: null,
        endedByUserId: null,
        finalizedAt: null,
        finalizedByUserId: null,
      },
      depositSubmissions: [],
      hostOrder: makeHostOrder(seasonId),
      sessionParticipants: [],
    };
  },

  season_active_dealing: () => {
    const seasonId = '01SE0000000000000000000006';
    const sessionId = '01SS0000000000000000000003';
    const participants: SessionParticipant[] = [
      // Carlos (treasurer): checked in + confirmed
      {
        id: '01SP0000000000000000000001',
        sessionId,
        type: 'member',
        userId: SEED_USERS[1].id, // Carlos
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      // Miguel (host): checked in, not confirmed
      {
        id: '01SP0000000000000000000002',
        sessionId,
        type: 'member',
        userId: SEED_USERS[2].id, // Miguel
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: null,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      // Andres: checked in, disputed
      {
        id: '01SP0000000000000000000003',
        sessionId,
        type: 'member',
        userId: SEED_USERS[3].id, // Andres
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: null,
        startDisputeNote: 'I received 450 not 500',
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      // Edgar (admin/current user): NOT checked in — no participant record
    ];

    return {
      season: {
        id: seasonId,
        name: 'Season Feb 2026',
        status: 'active' as const,
        createdByUserId: SEED_USERS[0].id,
        treasurerUserId: SEED_USERS[1].id, // Carlos
        createdAt: NOW,
        startedAt: NOW,
        endedAt: null,
      },
      members: makeMembers(seasonId, true),
      session: {
        id: sessionId,
        seasonId,
        state: 'dealing' as const,
        hostUserId: SEED_USERS[2].id, // Miguel
        scheduledFor: '2026-02-15T20:00:00.000Z',
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
      depositSubmissions: [],
      hostOrder: makeHostOrder(seasonId),
      sessionParticipants: participants,
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
      depositSubmissions: [],
      hostOrder: makeHostOrder(seasonId),
      sessionParticipants: [],
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
      depositSubmissions: [],
      hostOrder: makeHostOrder(seasonId),
      sessionParticipants: [],
    };
  },
};

export function applyPreset(key: PresetKey): void {
  const data = PRESETS[key]();
  mockStore.season = data.season;
  mockStore.members = data.members;
  mockStore.session = data.session;
  mockStore.depositSubmissions = data.depositSubmissions;
  mockStore.hostOrder = data.hostOrder;
  mockStore.sessionParticipants = data.sessionParticipants;
}
