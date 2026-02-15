import type { EndingSubmission, Season, SeasonMember, SeasonDepositSubmission, SeasonHostOrder, Session, SessionInjection, SessionParticipant } from '@/types';
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
  sessionInjections: SessionInjection[];
  endingSubmissions: EndingSubmission[];
};

export const mockStore: MockStore = {
  season: null,
  members: [],
  session: null,
  depositSubmissions: [],
  hostOrder: [],
  sessionParticipants: [],
  sessionInjections: [],
  endingSubmissions: [],
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
  | 'season_active_in_progress'
  | 'season_active_closing'
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
    sessionInjections: [],
    endingSubmissions: [],
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
      sessionInjections: [],
      endingSubmissions: [],
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
      sessionInjections: [],
      endingSubmissions: [],
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
      sessionInjections: [],
      endingSubmissions: [],
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
      sessionInjections: [],
      endingSubmissions: [],
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
      sessionInjections: [],
      endingSubmissions: [],
    };
  },

  season_active_in_progress: () => {
    const seasonId = '01SE0000000000000000000007';
    const sessionId = '01SS0000000000000000000004';

    const participants: SessionParticipant[] = [
      // Edgar (admin/current user): checked in + confirmed
      {
        id: '01SP0000000000000000000010',
        sessionId,
        type: 'member',
        userId: SEED_USERS[0].id,
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      // Carlos (treasurer): checked in + confirmed
      {
        id: '01SP0000000000000000000011',
        sessionId,
        type: 'member',
        userId: SEED_USERS[1].id,
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      // Miguel (host): checked in + confirmed
      {
        id: '01SP0000000000000000000012',
        sessionId,
        type: 'member',
        userId: SEED_USERS[2].id,
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      // Andres: checked in + confirmed
      {
        id: '01SP0000000000000000000013',
        sessionId,
        type: 'member',
        userId: SEED_USERS[3].id,
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
    ];

    const injections: SessionInjection[] = [
      // Edgar: approved 500 rebuy
      {
        id: '01SI0000000000000000000001',
        sessionId,
        participantId: '01SP0000000000000000000010',
        type: 'rebuy_500',
        amountCents: 50000,
        requestedByUserId: SEED_USERS[0].id,
        requestedAt: '2026-02-13T13:00:00.000Z',
        proofPhotoUrl: null,
        status: 'approved',
        reviewedAt: '2026-02-13T13:05:00.000Z',
        reviewedByUserId: SEED_USERS[1].id, // Carlos approved
        reviewNote: null,
        createdAt: '2026-02-13T13:00:00.000Z',
      },
      // Miguel: pending 500 rebuy
      {
        id: '01SI0000000000000000000002',
        sessionId,
        participantId: '01SP0000000000000000000012',
        type: 'rebuy_500',
        amountCents: 50000,
        requestedByUserId: SEED_USERS[2].id,
        requestedAt: '2026-02-13T13:30:00.000Z',
        proofPhotoUrl: 'https://placeholder.mock/rebuy-proof-1.jpg',
        status: 'pending',
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null,
        createdAt: '2026-02-13T13:30:00.000Z',
      },
      // Andres: rejected 250 rebuy
      {
        id: '01SI0000000000000000000003',
        sessionId,
        participantId: '01SP0000000000000000000013',
        type: 'half_250',
        amountCents: 25000,
        requestedByUserId: SEED_USERS[3].id,
        requestedAt: '2026-02-13T13:15:00.000Z',
        proofPhotoUrl: null,
        status: 'rejected',
        reviewedAt: '2026-02-13T13:20:00.000Z',
        reviewedByUserId: SEED_USERS[1].id,
        reviewNote: 'No proof photo attached',
        createdAt: '2026-02-13T13:15:00.000Z',
      },
      // Carlos: pending 250 rebuy
      {
        id: '01SI0000000000000000000004',
        sessionId,
        participantId: '01SP0000000000000000000011',
        type: 'half_250',
        amountCents: 25000,
        requestedByUserId: SEED_USERS[1].id,
        requestedAt: '2026-02-13T14:00:00.000Z',
        proofPhotoUrl: null,
        status: 'pending',
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null,
        createdAt: '2026-02-13T14:00:00.000Z',
      },
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
        state: 'in_progress' as const,
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
      sessionInjections: injections,
      endingSubmissions: [],
    };
  },

  season_active_closing: () => {
    const seasonId = '01SE0000000000000000000008';
    const sessionId = '01SS0000000000000000000005';

    const participants: SessionParticipant[] = [
      // Edgar (admin/current user): checked in + confirmed
      {
        id: '01SP0000000000000000000020',
        sessionId,
        type: 'member',
        userId: SEED_USERS[0].id,
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      // Carlos (treasurer): checked in + confirmed
      {
        id: '01SP0000000000000000000021',
        sessionId,
        type: 'member',
        userId: SEED_USERS[1].id,
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      // Miguel (host): checked in + confirmed
      {
        id: '01SP0000000000000000000022',
        sessionId,
        type: 'member',
        userId: SEED_USERS[2].id,
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      // Andres: checked in + confirmed
      {
        id: '01SP0000000000000000000023',
        sessionId,
        type: 'member',
        userId: SEED_USERS[3].id,
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
    ];

    // Edgar: 1x approved $500 rebuy
    const injections: SessionInjection[] = [
      {
        id: '01SI0000000000000000000010',
        sessionId,
        participantId: '01SP0000000000000000000020',
        type: 'rebuy_500',
        amountCents: 50000,
        requestedByUserId: SEED_USERS[0].id,
        requestedAt: '2026-02-13T13:00:00.000Z',
        proofPhotoUrl: null,
        status: 'approved',
        reviewedAt: '2026-02-13T13:05:00.000Z',
        reviewedByUserId: SEED_USERS[1].id,
        reviewNote: null,
        createdAt: '2026-02-13T13:00:00.000Z',
      },
    ];

    const endingSubmissions: EndingSubmission[] = [
      // Edgar (admin): validated — $850 ending stack
      {
        id: '01ES0000000000000000000001',
        sessionId,
        participantId: '01SP0000000000000000000020',
        endingStackCents: 85000,
        photoUrl: 'https://placeholder.mock/ending-edgar.jpg',
        submittedAt: '2026-02-13T15:00:00.000Z',
        submittedByUserId: SEED_USERS[0].id,
        note: null,
        status: 'validated',
        reviewedAt: '2026-02-13T15:05:00.000Z',
        reviewedByUserId: SEED_USERS[1].id,
        reviewNote: null,
        createdAt: '2026-02-13T15:00:00.000Z',
      },
      // Carlos (treasurer): pending — $600 ending stack
      {
        id: '01ES0000000000000000000002',
        sessionId,
        participantId: '01SP0000000000000000000021',
        endingStackCents: 60000,
        photoUrl: 'https://placeholder.mock/ending-carlos.jpg',
        submittedAt: '2026-02-13T15:10:00.000Z',
        submittedByUserId: SEED_USERS[1].id,
        note: 'Counted twice',
        status: 'pending',
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null,
        createdAt: '2026-02-13T15:10:00.000Z',
      },
      // Miguel (host): rejected — $300 ending stack
      {
        id: '01ES0000000000000000000003',
        sessionId,
        participantId: '01SP0000000000000000000022',
        endingStackCents: 30000,
        photoUrl: 'https://placeholder.mock/ending-miguel.jpg',
        submittedAt: '2026-02-13T15:15:00.000Z',
        submittedByUserId: SEED_USERS[2].id,
        note: null,
        status: 'rejected',
        reviewedAt: '2026-02-13T15:20:00.000Z',
        reviewedByUserId: SEED_USERS[1].id,
        reviewNote: 'Photo is blurry, please retake',
        createdAt: '2026-02-13T15:15:00.000Z',
      },
      // Andres: no submission (not in array)
    ];

    return {
      season: {
        id: seasonId,
        name: 'Season Feb 2026',
        status: 'active' as const,
        createdByUserId: SEED_USERS[0].id,
        treasurerUserId: SEED_USERS[1].id,
        createdAt: NOW,
        startedAt: NOW,
        endedAt: null,
      },
      members: makeMembers(seasonId, true),
      session: {
        id: sessionId,
        seasonId,
        state: 'closing' as const,
        hostUserId: SEED_USERS[2].id,
        scheduledFor: '2026-02-15T20:00:00.000Z',
        location: "Miguel's place",
        scheduledAt: NOW,
        scheduledByUserId: SEED_USERS[1].id,
        startedAt: NOW,
        startedByUserId: SEED_USERS[1].id,
        endedAt: '2026-02-13T14:30:00.000Z',
        endedByUserId: SEED_USERS[1].id,
        finalizedAt: null,
        finalizedByUserId: null,
      },
      depositSubmissions: [],
      hostOrder: makeHostOrder(seasonId),
      sessionParticipants: participants,
      sessionInjections: injections,
      endingSubmissions,
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
      sessionInjections: [],
      endingSubmissions: [],
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
      sessionInjections: [],
      endingSubmissions: [],
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
  mockStore.sessionInjections = data.sessionInjections;
  mockStore.endingSubmissions = data.endingSubmissions;
}
