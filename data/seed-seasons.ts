import type { EndingSubmission, Season, SeasonMember, SeasonDepositSubmission, SeasonHostOrder, Session, SessionFinalizeNote, SessionInjection, SessionParticipant } from '@/types';
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
  sessionFinalizeNotes: SessionFinalizeNote[];
  /** Historical finalized sessions for ledger views. */
  finalizedSessions: Session[];
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
  sessionFinalizeNotes: [],
  finalizedSessions: [],
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
  | 'season_active_dealing_with_guest'
  | 'season_active_in_progress'
  | 'season_active_closing'
  | 'season_active_finalized'
  | 'season_active_with_session'
  | 'season_active_multi_session'
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
    sessionFinalizeNotes: [],
    finalizedSessions: [],
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
      sessionFinalizeNotes: [],
      finalizedSessions: [],
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
      sessionFinalizeNotes: [],
      finalizedSessions: [],
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
      sessionFinalizeNotes: [],
      finalizedSessions: [],
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
      sessionFinalizeNotes: [],
      finalizedSessions: [],
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
      sessionFinalizeNotes: [],
      finalizedSessions: [],
    };
  },

  season_active_dealing_with_guest: () => {
    const seasonId = '01SE000000000000000000000G';
    const sessionId = '01SS000000000000000000000G';
    const participants: SessionParticipant[] = [
      // Carlos (treasurer): checked in + confirmed
      {
        id: '01SP000000000000000G000001',
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
      // Miguel: checked in, not confirmed
      {
        id: '01SP000000000000000G000002',
        sessionId,
        type: 'member',
        userId: SEED_USERS[2].id,
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: null,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      // Guest: Roberto (auto checked-in + confirmed, starting stack 0)
      {
        id: '01SP000000000000000G000003',
        sessionId,
        type: 'guest_ephemeral',
        userId: null,
        guestName: 'Roberto',
        startingStackCents: 0,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
    ];

    const injections: SessionInjection[] = [
      // Roberto's auto-approved guest buy-in
      {
        id: '01SI000000000000000G000001',
        sessionId,
        participantId: '01SP000000000000000G000003',
        type: 'guest_buyin_500',
        amountCents: 50000,
        requestedByUserId: SEED_USERS[1].id,
        requestedAt: NOW,
        proofPhotoUrl: null,
        status: 'approved',
        reviewedAt: NOW,
        reviewedByUserId: SEED_USERS[1].id,
        reviewNote: 'Auto-approved guest buy-in',
        createdAt: NOW,
      },
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
        state: 'dealing' as const,
        hostUserId: SEED_USERS[2].id,
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
      sessionFinalizeNotes: [],
      finalizedSessions: [],
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
      sessionFinalizeNotes: [],
      finalizedSessions: [],
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
      sessionFinalizeNotes: [],
      finalizedSessions: [],
    };
  },

  season_active_finalized: () => {
    const seasonId = '01SE0000000000000000000009';
    const sessionId = '01SS0000000000000000000006';

    const participants: SessionParticipant[] = [
      {
        id: '01SP0000000000000000000030',
        sessionId,
        type: 'member',
        userId: SEED_USERS[0].id, // Edgar
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      {
        id: '01SP0000000000000000000031',
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
      {
        id: '01SP0000000000000000000032',
        sessionId,
        type: 'member',
        userId: SEED_USERS[2].id, // Miguel
        guestName: null,
        startingStackCents: 50000,
        checkedInAt: NOW,
        confirmedStartAt: NOW,
        startDisputeNote: null,
        removedAt: null,
        removedByUserId: null,
        createdAt: NOW,
      },
      {
        id: '01SP0000000000000000000033',
        sessionId,
        type: 'member',
        userId: SEED_USERS[3].id, // Andres
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
        id: '01SI0000000000000000000020',
        sessionId,
        participantId: '01SP0000000000000000000030',
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

    // All validated, balanced:
    // Edgar: start=500, rebuys=500, total_in=1000, ending=850 => PnL = 850-500-500 = -150
    // Carlos: start=500, rebuys=0, total_in=500, ending=600 => PnL = 600-500-0 = +100
    // Miguel: start=500, rebuys=0, total_in=500, ending=300 => PnL = 300-500-0 = -200
    // Andres: start=500, rebuys=0, total_in=500, ending=750 => PnL = 750-500-0 = +250
    // Sum: -150+100-200+250 = 0 (balanced)
    const endingSubmissions: EndingSubmission[] = [
      {
        id: '01ES0000000000000000000010',
        sessionId,
        participantId: '01SP0000000000000000000030',
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
      {
        id: '01ES0000000000000000000011',
        sessionId,
        participantId: '01SP0000000000000000000031',
        endingStackCents: 60000,
        photoUrl: 'https://placeholder.mock/ending-carlos.jpg',
        submittedAt: '2026-02-13T15:10:00.000Z',
        submittedByUserId: SEED_USERS[1].id,
        note: null,
        status: 'validated',
        reviewedAt: '2026-02-13T15:15:00.000Z',
        reviewedByUserId: SEED_USERS[1].id,
        reviewNote: null,
        createdAt: '2026-02-13T15:10:00.000Z',
      },
      {
        id: '01ES0000000000000000000012',
        sessionId,
        participantId: '01SP0000000000000000000032',
        endingStackCents: 30000,
        photoUrl: 'https://placeholder.mock/ending-miguel.jpg',
        submittedAt: '2026-02-13T15:15:00.000Z',
        submittedByUserId: SEED_USERS[2].id,
        note: null,
        status: 'validated',
        reviewedAt: '2026-02-13T15:20:00.000Z',
        reviewedByUserId: SEED_USERS[1].id,
        reviewNote: null,
        createdAt: '2026-02-13T15:15:00.000Z',
      },
      {
        id: '01ES0000000000000000000013',
        sessionId,
        participantId: '01SP0000000000000000000033',
        endingStackCents: 75000,
        photoUrl: 'https://placeholder.mock/ending-andres.jpg',
        submittedAt: '2026-02-13T15:20:00.000Z',
        submittedByUserId: SEED_USERS[3].id,
        note: null,
        status: 'validated',
        reviewedAt: '2026-02-13T15:25:00.000Z',
        reviewedByUserId: SEED_USERS[1].id,
        reviewNote: null,
        createdAt: '2026-02-13T15:20:00.000Z',
      },
    ];

    // Season members with updated balances post-finalization
    const members: SeasonMember[] = SEED_USERS.map((u, i) => {
      // Only the 4 participants get updated balances
      const balanceMap: Record<string, number> = {
        [SEED_USERS[0].id]: 85000, // Edgar: ending=850
        [SEED_USERS[1].id]: 60000, // Carlos: ending=600
        [SEED_USERS[2].id]: 30000, // Miguel: ending=300
        [SEED_USERS[3].id]: 75000, // Andres: ending=750
      };
      return {
        id: `01SM000000000000000000${String(i + 1).padStart(4, '0')}`,
        seasonId,
        userId: u.id,
        approvalStatus: 'approved' as const,
        currentBalanceCents: balanceMap[u.id] ?? 50000,
        approvedAt: NOW,
        approvedByUserId: SEED_USERS[1].id,
        rejectionNote: null,
        createdAt: NOW,
      };
    });

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
      members,
      session: {
        id: sessionId,
        seasonId,
        state: 'finalized' as const,
        hostUserId: SEED_USERS[2].id,
        scheduledFor: '2026-02-15T20:00:00.000Z',
        location: "Miguel's place",
        scheduledAt: NOW,
        scheduledByUserId: SEED_USERS[1].id,
        startedAt: NOW,
        startedByUserId: SEED_USERS[1].id,
        endedAt: '2026-02-13T14:30:00.000Z',
        endedByUserId: SEED_USERS[1].id,
        finalizedAt: '2026-02-13T16:00:00.000Z',
        finalizedByUserId: SEED_USERS[1].id,
      },
      depositSubmissions: [],
      hostOrder: makeHostOrder(seasonId),
      sessionParticipants: participants,
      sessionInjections: injections,
      endingSubmissions,
      sessionFinalizeNotes: [],
      finalizedSessions: [],
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
      sessionFinalizeNotes: [],
      finalizedSessions: [],
    };
  },

  // ---------------------------------------------------------------------------
  // Multi-session preset — 3 finalized sessions + 1 in-progress (for ledger)
  // ---------------------------------------------------------------------------
  season_active_multi_session: () => {
    const seasonId = '01SEMS000000000000000000L1';
    const treasurer = SEED_USERS[1]; // Carlos

    // Session 1: Feb 1 — 6 players, balanced
    const s1Id = '01SSMS00000000000000000001';
    const s1Participants: SessionParticipant[] = [
      { id: '01SPMS00000000000000000101', sessionId: s1Id, type: 'member', userId: SEED_USERS[0].id, guestName: null, startingStackCents: 50000, checkedInAt: '2026-02-01T19:00:00.000Z', confirmedStartAt: '2026-02-01T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-01T19:00:00.000Z' },
      { id: '01SPMS00000000000000000102', sessionId: s1Id, type: 'member', userId: SEED_USERS[1].id, guestName: null, startingStackCents: 50000, checkedInAt: '2026-02-01T19:00:00.000Z', confirmedStartAt: '2026-02-01T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-01T19:00:00.000Z' },
      { id: '01SPMS00000000000000000103', sessionId: s1Id, type: 'member', userId: SEED_USERS[2].id, guestName: null, startingStackCents: 50000, checkedInAt: '2026-02-01T19:00:00.000Z', confirmedStartAt: '2026-02-01T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-01T19:00:00.000Z' },
      { id: '01SPMS00000000000000000104', sessionId: s1Id, type: 'member', userId: SEED_USERS[3].id, guestName: null, startingStackCents: 50000, checkedInAt: '2026-02-01T19:00:00.000Z', confirmedStartAt: '2026-02-01T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-01T19:00:00.000Z' },
      { id: '01SPMS00000000000000000105', sessionId: s1Id, type: 'member', userId: SEED_USERS[4].id, guestName: null, startingStackCents: 50000, checkedInAt: '2026-02-01T19:00:00.000Z', confirmedStartAt: '2026-02-01T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-01T19:00:00.000Z' },
      { id: '01SPMS00000000000000000106', sessionId: s1Id, type: 'member', userId: SEED_USERS[5].id, guestName: null, startingStackCents: 50000, checkedInAt: '2026-02-01T19:00:00.000Z', confirmedStartAt: '2026-02-01T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-01T19:00:00.000Z' },
    ];
    // S1 injections: Edgar 1x500, Jorge 1x500
    const s1Injections: SessionInjection[] = [
      { id: '01SIMS00000000000000000101', sessionId: s1Id, participantId: '01SPMS00000000000000000101', type: 'rebuy_500', amountCents: 50000, requestedByUserId: SEED_USERS[0].id, requestedAt: '2026-02-01T20:30:00.000Z', proofPhotoUrl: null, status: 'approved', reviewedAt: '2026-02-01T20:35:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-01T20:30:00.000Z' },
      { id: '01SIMS00000000000000000102', sessionId: s1Id, participantId: '01SPMS00000000000000000105', type: 'rebuy_500', amountCents: 50000, requestedByUserId: SEED_USERS[4].id, requestedAt: '2026-02-01T21:00:00.000Z', proofPhotoUrl: null, status: 'approved', reviewedAt: '2026-02-01T21:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-01T21:00:00.000Z' },
    ];
    // S1 endings — sum PnL = 0
    // Edgar:  start=500, rebuys=500, total_in=1000, ending=650  => PnL = 650-500-500 = -350
    // Carlos: start=500, rebuys=0,   total_in=500,  ending=850  => PnL = 850-500-0   = +350
    // Miguel: start=500, rebuys=0,   total_in=500,  ending=400  => PnL = 400-500-0   = -100
    // Andres: start=500, rebuys=0,   total_in=500,  ending=700  => PnL = 700-500-0   = +200
    // Jorge:  start=500, rebuys=500, total_in=1000, ending=1150 => PnL = 1150-500-500= +150
    // Luis:   start=500, rebuys=0,   total_in=500,  ending=250  => PnL = 250-500-0   = -250
    // Sum = -350+350-100+200+150-250 = 0
    const s1Endings: EndingSubmission[] = [
      { id: '01ESMS00000000000000000101', sessionId: s1Id, participantId: '01SPMS00000000000000000101', endingStackCents: 65000, photoUrl: 'mock://s1-edgar.jpg', submittedAt: '2026-02-01T23:00:00.000Z', submittedByUserId: SEED_USERS[0].id, note: null, status: 'validated', reviewedAt: '2026-02-01T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-01T23:00:00.000Z' },
      { id: '01ESMS00000000000000000102', sessionId: s1Id, participantId: '01SPMS00000000000000000102', endingStackCents: 85000, photoUrl: 'mock://s1-carlos.jpg', submittedAt: '2026-02-01T23:00:00.000Z', submittedByUserId: SEED_USERS[1].id, note: null, status: 'validated', reviewedAt: '2026-02-01T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-01T23:00:00.000Z' },
      { id: '01ESMS00000000000000000103', sessionId: s1Id, participantId: '01SPMS00000000000000000103', endingStackCents: 40000, photoUrl: 'mock://s1-miguel.jpg', submittedAt: '2026-02-01T23:00:00.000Z', submittedByUserId: SEED_USERS[2].id, note: null, status: 'validated', reviewedAt: '2026-02-01T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-01T23:00:00.000Z' },
      { id: '01ESMS00000000000000000104', sessionId: s1Id, participantId: '01SPMS00000000000000000104', endingStackCents: 70000, photoUrl: 'mock://s1-andres.jpg', submittedAt: '2026-02-01T23:00:00.000Z', submittedByUserId: SEED_USERS[3].id, note: null, status: 'validated', reviewedAt: '2026-02-01T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-01T23:00:00.000Z' },
      { id: '01ESMS00000000000000000105', sessionId: s1Id, participantId: '01SPMS00000000000000000105', endingStackCents: 115000, photoUrl: 'mock://s1-jorge.jpg', submittedAt: '2026-02-01T23:00:00.000Z', submittedByUserId: SEED_USERS[4].id, note: null, status: 'validated', reviewedAt: '2026-02-01T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-01T23:00:00.000Z' },
      { id: '01ESMS00000000000000000106', sessionId: s1Id, participantId: '01SPMS00000000000000000106', endingStackCents: 25000, photoUrl: 'mock://s1-luis.jpg', submittedAt: '2026-02-01T23:00:00.000Z', submittedByUserId: SEED_USERS[5].id, note: null, status: 'validated', reviewedAt: '2026-02-01T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-01T23:00:00.000Z' },
    ];

    // Session 2: Feb 5 — 5 players (different mix), balanced
    const s2Id = '01SSMS00000000000000000002';
    const s2Participants: SessionParticipant[] = [
      { id: '01SPMS00000000000000000201', sessionId: s2Id, type: 'member', userId: SEED_USERS[0].id, guestName: null, startingStackCents: 65000, checkedInAt: '2026-02-05T19:00:00.000Z', confirmedStartAt: '2026-02-05T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-05T19:00:00.000Z' },
      { id: '01SPMS00000000000000000202', sessionId: s2Id, type: 'member', userId: SEED_USERS[1].id, guestName: null, startingStackCents: 85000, checkedInAt: '2026-02-05T19:00:00.000Z', confirmedStartAt: '2026-02-05T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-05T19:00:00.000Z' },
      { id: '01SPMS00000000000000000203', sessionId: s2Id, type: 'member', userId: SEED_USERS[2].id, guestName: null, startingStackCents: 40000, checkedInAt: '2026-02-05T19:00:00.000Z', confirmedStartAt: '2026-02-05T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-05T19:00:00.000Z' },
      { id: '01SPMS00000000000000000204', sessionId: s2Id, type: 'member', userId: SEED_USERS[3].id, guestName: null, startingStackCents: 70000, checkedInAt: '2026-02-05T19:00:00.000Z', confirmedStartAt: '2026-02-05T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-05T19:00:00.000Z' },
      { id: '01SPMS00000000000000000205', sessionId: s2Id, type: 'member', userId: SEED_USERS[6].id, guestName: null, startingStackCents: 50000, checkedInAt: '2026-02-05T19:00:00.000Z', confirmedStartAt: '2026-02-05T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-05T19:00:00.000Z' },
    ];
    // S2 injections: Miguel 1x500, Andres 1x250
    const s2Injections: SessionInjection[] = [
      { id: '01SIMS00000000000000000201', sessionId: s2Id, participantId: '01SPMS00000000000000000203', type: 'rebuy_500', amountCents: 50000, requestedByUserId: SEED_USERS[2].id, requestedAt: '2026-02-05T20:30:00.000Z', proofPhotoUrl: null, status: 'approved', reviewedAt: '2026-02-05T20:35:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-05T20:30:00.000Z' },
      { id: '01SIMS00000000000000000202', sessionId: s2Id, participantId: '01SPMS00000000000000000204', type: 'half_250', amountCents: 25000, requestedByUserId: SEED_USERS[3].id, requestedAt: '2026-02-05T21:00:00.000Z', proofPhotoUrl: null, status: 'approved', reviewedAt: '2026-02-05T21:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-05T21:00:00.000Z' },
    ];
    // S2 endings — sum PnL = 0
    // Edgar:   start=650,  rebuys=0,   ending=900   => PnL = 900-650-0   = +250
    // Carlos:  start=850,  rebuys=0,   ending=550   => PnL = 550-850-0   = -300
    // Miguel:  start=400,  rebuys=500, ending=750   => PnL = 750-400-500 = -150
    // Andres:  start=700,  rebuys=250, ending=850   => PnL = 850-700-250 = -100
    // Ricardo: start=500,  rebuys=0,   ending=800   => PnL = 800-500-0   = +300
    // Sum = +250-300-150-100+300 = 0
    const s2Endings: EndingSubmission[] = [
      { id: '01ESMS00000000000000000201', sessionId: s2Id, participantId: '01SPMS00000000000000000201', endingStackCents: 90000, photoUrl: 'mock://s2-edgar.jpg', submittedAt: '2026-02-05T23:00:00.000Z', submittedByUserId: SEED_USERS[0].id, note: null, status: 'validated', reviewedAt: '2026-02-05T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-05T23:00:00.000Z' },
      { id: '01ESMS00000000000000000202', sessionId: s2Id, participantId: '01SPMS00000000000000000202', endingStackCents: 55000, photoUrl: 'mock://s2-carlos.jpg', submittedAt: '2026-02-05T23:00:00.000Z', submittedByUserId: SEED_USERS[1].id, note: null, status: 'validated', reviewedAt: '2026-02-05T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-05T23:00:00.000Z' },
      { id: '01ESMS00000000000000000203', sessionId: s2Id, participantId: '01SPMS00000000000000000203', endingStackCents: 75000, photoUrl: 'mock://s2-miguel.jpg', submittedAt: '2026-02-05T23:00:00.000Z', submittedByUserId: SEED_USERS[2].id, note: null, status: 'validated', reviewedAt: '2026-02-05T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-05T23:00:00.000Z' },
      { id: '01ESMS00000000000000000204', sessionId: s2Id, participantId: '01SPMS00000000000000000204', endingStackCents: 85000, photoUrl: 'mock://s2-andres.jpg', submittedAt: '2026-02-05T23:00:00.000Z', submittedByUserId: SEED_USERS[3].id, note: null, status: 'validated', reviewedAt: '2026-02-05T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-05T23:00:00.000Z' },
      { id: '01ESMS00000000000000000205', sessionId: s2Id, participantId: '01SPMS00000000000000000205', endingStackCents: 80000, photoUrl: 'mock://s2-ricardo.jpg', submittedAt: '2026-02-05T23:00:00.000Z', submittedByUserId: SEED_USERS[6].id, note: null, status: 'validated', reviewedAt: '2026-02-05T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-05T23:00:00.000Z' },
    ];

    // Session 3: Feb 9 — 4 players, balanced
    const s3Id = '01SSMS00000000000000000003';
    const s3Participants: SessionParticipant[] = [
      { id: '01SPMS00000000000000000301', sessionId: s3Id, type: 'member', userId: SEED_USERS[0].id, guestName: null, startingStackCents: 90000, checkedInAt: '2026-02-09T19:00:00.000Z', confirmedStartAt: '2026-02-09T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-09T19:00:00.000Z' },
      { id: '01SPMS00000000000000000302', sessionId: s3Id, type: 'member', userId: SEED_USERS[1].id, guestName: null, startingStackCents: 55000, checkedInAt: '2026-02-09T19:00:00.000Z', confirmedStartAt: '2026-02-09T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-09T19:00:00.000Z' },
      { id: '01SPMS00000000000000000303', sessionId: s3Id, type: 'member', userId: SEED_USERS[4].id, guestName: null, startingStackCents: 115000, checkedInAt: '2026-02-09T19:00:00.000Z', confirmedStartAt: '2026-02-09T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-09T19:00:00.000Z' },
      { id: '01SPMS00000000000000000304', sessionId: s3Id, type: 'member', userId: SEED_USERS[5].id, guestName: null, startingStackCents: 25000, checkedInAt: '2026-02-09T19:00:00.000Z', confirmedStartAt: '2026-02-09T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-09T19:00:00.000Z' },
    ];
    // S3 injections: Luis 1x500
    const s3Injections: SessionInjection[] = [
      { id: '01SIMS00000000000000000301', sessionId: s3Id, participantId: '01SPMS00000000000000000304', type: 'rebuy_500', amountCents: 50000, requestedByUserId: SEED_USERS[5].id, requestedAt: '2026-02-09T21:00:00.000Z', proofPhotoUrl: null, status: 'approved', reviewedAt: '2026-02-09T21:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-09T21:00:00.000Z' },
    ];
    // S3 endings — sum PnL = 0
    // Edgar:  start=900,  rebuys=0,   ending=750   => PnL = 750-900-0   = -150
    // Carlos: start=550,  rebuys=0,   ending=800   => PnL = 800-550-0   = +250
    // Jorge:  start=1150, rebuys=0,   ending=950   => PnL = 950-1150-0  = -200
    // Luis:   start=250,  rebuys=500, ending=850   => PnL = 850-250-500 = +100
    // Sum = -150+250-200+100 = 0
    const s3Endings: EndingSubmission[] = [
      { id: '01ESMS00000000000000000301', sessionId: s3Id, participantId: '01SPMS00000000000000000301', endingStackCents: 75000, photoUrl: 'mock://s3-edgar.jpg', submittedAt: '2026-02-09T23:00:00.000Z', submittedByUserId: SEED_USERS[0].id, note: null, status: 'validated', reviewedAt: '2026-02-09T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-09T23:00:00.000Z' },
      { id: '01ESMS00000000000000000302', sessionId: s3Id, participantId: '01SPMS00000000000000000302', endingStackCents: 80000, photoUrl: 'mock://s3-carlos.jpg', submittedAt: '2026-02-09T23:00:00.000Z', submittedByUserId: SEED_USERS[1].id, note: null, status: 'validated', reviewedAt: '2026-02-09T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-09T23:00:00.000Z' },
      { id: '01ESMS00000000000000000303', sessionId: s3Id, participantId: '01SPMS00000000000000000303', endingStackCents: 95000, photoUrl: 'mock://s3-jorge.jpg', submittedAt: '2026-02-09T23:00:00.000Z', submittedByUserId: SEED_USERS[4].id, note: null, status: 'validated', reviewedAt: '2026-02-09T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-09T23:00:00.000Z' },
      { id: '01ESMS00000000000000000304', sessionId: s3Id, participantId: '01SPMS00000000000000000304', endingStackCents: 85000, photoUrl: 'mock://s3-luis.jpg', submittedAt: '2026-02-09T23:00:00.000Z', submittedByUserId: SEED_USERS[5].id, note: null, status: 'validated', reviewedAt: '2026-02-09T23:05:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-09T23:00:00.000Z' },
    ];

    // Session 4: Feb 14 — currently in_progress (live)
    const s4Id = '01SSMS00000000000000000004';
    const s4Participants: SessionParticipant[] = [
      { id: '01SPMS00000000000000000401', sessionId: s4Id, type: 'member', userId: SEED_USERS[0].id, guestName: null, startingStackCents: 75000, checkedInAt: '2026-02-14T19:00:00.000Z', confirmedStartAt: '2026-02-14T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-14T19:00:00.000Z' },
      { id: '01SPMS00000000000000000402', sessionId: s4Id, type: 'member', userId: SEED_USERS[1].id, guestName: null, startingStackCents: 80000, checkedInAt: '2026-02-14T19:00:00.000Z', confirmedStartAt: '2026-02-14T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-14T19:00:00.000Z' },
      { id: '01SPMS00000000000000000403', sessionId: s4Id, type: 'member', userId: SEED_USERS[2].id, guestName: null, startingStackCents: 75000, checkedInAt: '2026-02-14T19:00:00.000Z', confirmedStartAt: '2026-02-14T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-14T19:00:00.000Z' },
      { id: '01SPMS00000000000000000404', sessionId: s4Id, type: 'member', userId: SEED_USERS[3].id, guestName: null, startingStackCents: 85000, checkedInAt: '2026-02-14T19:00:00.000Z', confirmedStartAt: '2026-02-14T19:05:00.000Z', startDisputeNote: null, removedAt: null, removedByUserId: null, createdAt: '2026-02-14T19:00:00.000Z' },
    ];
    const s4Injections: SessionInjection[] = [
      { id: '01SIMS00000000000000000401', sessionId: s4Id, participantId: '01SPMS00000000000000000401', type: 'rebuy_500', amountCents: 50000, requestedByUserId: SEED_USERS[0].id, requestedAt: '2026-02-14T20:30:00.000Z', proofPhotoUrl: null, status: 'approved', reviewedAt: '2026-02-14T20:35:00.000Z', reviewedByUserId: treasurer.id, reviewNote: null, createdAt: '2026-02-14T20:30:00.000Z' },
    ];

    // Finalized sessions
    const session1: Session = {
      id: s1Id, seasonId, state: 'finalized', hostUserId: SEED_USERS[0].id,
      scheduledFor: '2026-02-01T19:00:00.000Z', location: "Edgar's place",
      scheduledAt: '2026-01-30T10:00:00.000Z', scheduledByUserId: treasurer.id,
      startedAt: '2026-02-01T19:10:00.000Z', startedByUserId: treasurer.id,
      endedAt: '2026-02-01T22:30:00.000Z', endedByUserId: treasurer.id,
      finalizedAt: '2026-02-01T23:15:00.000Z', finalizedByUserId: treasurer.id,
    };
    const session2: Session = {
      id: s2Id, seasonId, state: 'finalized', hostUserId: SEED_USERS[1].id,
      scheduledFor: '2026-02-05T19:00:00.000Z', location: "Carlos's place",
      scheduledAt: '2026-02-03T10:00:00.000Z', scheduledByUserId: treasurer.id,
      startedAt: '2026-02-05T19:10:00.000Z', startedByUserId: treasurer.id,
      endedAt: '2026-02-05T22:30:00.000Z', endedByUserId: treasurer.id,
      finalizedAt: '2026-02-05T23:15:00.000Z', finalizedByUserId: treasurer.id,
    };
    const session3: Session = {
      id: s3Id, seasonId, state: 'finalized', hostUserId: SEED_USERS[2].id,
      scheduledFor: '2026-02-09T19:00:00.000Z', location: "Miguel's place",
      scheduledAt: '2026-02-07T10:00:00.000Z', scheduledByUserId: treasurer.id,
      startedAt: '2026-02-09T19:10:00.000Z', startedByUserId: treasurer.id,
      endedAt: '2026-02-09T22:30:00.000Z', endedByUserId: treasurer.id,
      finalizedAt: '2026-02-09T23:15:00.000Z', finalizedByUserId: treasurer.id,
    };
    const session4: Session = {
      id: s4Id, seasonId, state: 'in_progress', hostUserId: SEED_USERS[3].id,
      scheduledFor: '2026-02-14T19:00:00.000Z', location: "Andres's place",
      scheduledAt: '2026-02-12T10:00:00.000Z', scheduledByUserId: treasurer.id,
      startedAt: '2026-02-14T19:10:00.000Z', startedByUserId: treasurer.id,
      endedAt: null, endedByUserId: null,
      finalizedAt: null, finalizedByUserId: null,
    };

    // Final season balances after 3 finalized sessions:
    // Edgar:   played s1,s2,s3 => ending s3=750 => balance=750
    // Carlos:  played s1,s2,s3 => ending s3=800 => balance=800
    // Miguel:  played s1,s2    => ending s2=750 => balance=750
    // Andres:  played s1,s2    => ending s2=850 => balance=850
    // Jorge:   played s1,s3    => ending s3=950 => balance=950
    // Luis:    played s1,s3    => ending s3=850 => balance=850
    // Ricardo: played s2       => ending s2=800 => balance=800
    // Others:  not played      => balance=500 (initial)
    const balanceMap: Record<string, number> = {
      [SEED_USERS[0].id]: 75000,  // Edgar
      [SEED_USERS[1].id]: 80000,  // Carlos
      [SEED_USERS[2].id]: 75000,  // Miguel
      [SEED_USERS[3].id]: 85000,  // Andres
      [SEED_USERS[4].id]: 95000,  // Jorge
      [SEED_USERS[5].id]: 85000,  // Luis
      [SEED_USERS[6].id]: 80000,  // Ricardo
    };

    const members: SeasonMember[] = SEED_USERS.map((u, i) => ({
      id: `01SMMS0000000000000000${String(i + 1).padStart(4, '0')}`,
      seasonId,
      userId: u.id,
      approvalStatus: 'approved' as const,
      currentBalanceCents: balanceMap[u.id] ?? 50000,
      approvedAt: '2026-01-28T10:00:00.000Z',
      approvedByUserId: treasurer.id,
      rejectionNote: null,
      createdAt: '2026-01-28T10:00:00.000Z',
    }));

    return {
      season: {
        id: seasonId,
        name: 'Season Feb 2026',
        status: 'active' as const,
        createdByUserId: SEED_USERS[0].id,
        treasurerUserId: treasurer.id,
        createdAt: '2026-01-28T10:00:00.000Z',
        startedAt: '2026-01-30T10:00:00.000Z',
        endedAt: null,
      },
      members,
      session: session4, // current live session
      depositSubmissions: [],
      hostOrder: makeHostOrder(seasonId),
      sessionParticipants: [
        ...s1Participants, ...s2Participants, ...s3Participants, ...s4Participants,
      ],
      sessionInjections: [
        ...s1Injections, ...s2Injections, ...s3Injections, ...s4Injections,
      ],
      endingSubmissions: [
        ...s1Endings, ...s2Endings, ...s3Endings,
      ],
      sessionFinalizeNotes: [],
      finalizedSessions: [session1, session2, session3],
    };
  },

  season_ended: () => {
    const seasonId = '01SE0000000000000000000004';
    // Varied balances so the payout report has meaningful data
    const balances = [75000, 80000, 30000, 95000, 115000, 25000, 80000, 50000, 50000, 50000];
    const members: SeasonMember[] = SEED_USERS.map((u, i) => ({
      id: `01SM000000000000000000${String(i + 1).padStart(4, '0')}`,
      seasonId,
      userId: u.id,
      approvalStatus: 'approved' as const,
      currentBalanceCents: balances[i] ?? 50000,
      approvedAt: NOW,
      approvedByUserId: SEED_USERS[1].id,
      rejectionNote: null,
      createdAt: NOW,
    }));
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
      members,
      session: null,
      depositSubmissions: [],
      hostOrder: makeHostOrder(seasonId),
      sessionParticipants: [],
      sessionInjections: [],
      endingSubmissions: [],
      sessionFinalizeNotes: [],
      finalizedSessions: [],
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
  mockStore.sessionFinalizeNotes = data.sessionFinalizeNotes;
  mockStore.finalizedSessions = data.finalizedSessions;
}
