import { mockStore } from '@/data/seed-seasons';
import { SEED_USERS, SEED_USERS_BY_EMAIL } from '@/data/seed-users';
import type { ApiClient } from './types';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Parse a mock token to extract the email.
 * Format: `mock-session-<email>-<timestamp>`
 */
function emailFromToken(token: string): string | null {
  const match = token.match(/^mock-session-(.+)-\d+$/);
  return match?.[1] ?? null;
}

/** In-memory token → email map for the current process lifetime. */
const activeTokens = new Map<string, string>();

function makeId(prefix: string): string {
  return `${prefix}${Date.now().toString(36).padStart(22, '0')}`.slice(0, 26);
}

/**
 * Mock API client.
 * To swap for a real backend: implement the `ApiClient` interface and change this export.
 */
export const api: ApiClient = {
  async sendMagicLink(email: string) {
    await delay(800);
    const normalized = email.toLowerCase().trim();
    const user = SEED_USERS_BY_EMAIL.get(normalized);
    if (!user) {
      throw new Error('Email not found in allowlist');
    }
    return { success: true, message: `Magic link sent to ${user.email}` };
  },

  async verifyMagicLink(email: string, _code: string) {
    await delay(500);
    const normalized = email.toLowerCase().trim();
    const user = SEED_USERS_BY_EMAIL.get(normalized);
    if (!user) {
      throw new Error('Email not found in allowlist');
    }
    const token = `mock-session-${normalized}-${Date.now()}`;
    activeTokens.set(token, normalized);
    return { token, user };
  },

  async getMe(token: string) {
    await delay(300);

    // First try in-memory map (same process)
    const emailFromMap = activeTokens.get(token);
    if (emailFromMap) {
      const user = SEED_USERS_BY_EMAIL.get(emailFromMap);
      if (user) return { user };
    }

    // Fallback: parse email from token (survives app restart)
    const emailFromParsed = emailFromToken(token);
    if (emailFromParsed) {
      const user = SEED_USERS_BY_EMAIL.get(emailFromParsed);
      if (user) {
        activeTokens.set(token, emailFromParsed);
        return { user };
      }
    }

    throw new Error('Invalid or expired session');
  },

  async getActiveSeason() {
    await delay(300);
    return { season: mockStore.season, members: mockStore.members };
  },

  async getActiveSession() {
    await delay(200);
    return { session: mockStore.session };
  },

  async getUsers() {
    await delay(200);
    return { users: SEED_USERS };
  },

  async createSeason(req) {
    await delay(600);
    const now = new Date().toISOString();
    const seasonId = makeId('01SE');

    const season = {
      id: seasonId,
      name: req.name ?? null,
      status: 'setup' as const,
      createdByUserId: SEED_USERS[0].id, // current user — mock assumes admin
      treasurerUserId: req.treasurerUserId,
      createdAt: now,
      startedAt: null,
      endedAt: null,
    };

    const members = SEED_USERS.map((u, i) => ({
      id: makeId('01SM') + String(i).padStart(2, '0'),
      seasonId,
      userId: u.id,
      approvalStatus: 'not_submitted' as const,
      currentBalanceCents: 0,
      approvedAt: null,
      approvedByUserId: null,
      rejectionNote: null,
      createdAt: now,
    }));

    const hostOrder = SEED_USERS.map((u, i) => ({
      id: makeId('01SH') + String(i).padStart(2, '0'),
      seasonId,
      userId: u.id,
      sortIndex: i,
      updatedAt: now,
    }));

    mockStore.season = season;
    mockStore.members = members;
    mockStore.session = null;
    mockStore.depositSubmissions = [];
    mockStore.hostOrder = hostOrder;
    mockStore.sessionParticipants = [];
    mockStore.sessionInjections = [];
    mockStore.endingSubmissions = [];

    return { season, members };
  },

  // ---------------------------------------------------------------------------
  // Deposit submissions
  // ---------------------------------------------------------------------------

  async submitDeposit(req) {
    await delay(500);
    const now = new Date().toISOString();

    if (!mockStore.season || mockStore.season.id !== req.seasonId) {
      throw new Error('Season not found');
    }

    const member = mockStore.members.find((m) => m.userId === req.userId);
    if (!member) throw new Error('Member not found');

    const submission = {
      id: makeId('01SD'),
      seasonId: req.seasonId,
      userId: req.userId,
      photoUrl: req.photoUri,
      note: req.note ?? null,
      status: 'pending' as const,
      reviewedAt: null,
      reviewedByUserId: null,
      reviewNote: null,
      createdAt: now,
    };

    mockStore.depositSubmissions.push(submission);
    member.approvalStatus = 'pending';

    return { submission, member };
  },

  async getDepositSubmissions(seasonId: string) {
    await delay(300);
    const submissions = mockStore.depositSubmissions.filter((s) => s.seasonId === seasonId);
    return { submissions };
  },

  async reviewDeposit(req) {
    await delay(400);
    const now = new Date().toISOString();

    const submission = mockStore.depositSubmissions.find((s) => s.id === req.submissionId);
    if (!submission) throw new Error('Submission not found');

    const member = mockStore.members.find(
      (m) => m.userId === submission.userId && m.seasonId === submission.seasonId,
    );
    if (!member) throw new Error('Member not found');

    submission.status = req.action === 'approve' ? 'approved' : 'rejected';
    submission.reviewedAt = now;
    submission.reviewedByUserId = mockStore.season?.treasurerUserId ?? null;
    submission.reviewNote = req.reviewNote ?? null;

    if (req.action === 'approve') {
      member.approvalStatus = 'approved';
      member.currentBalanceCents = 50000; // 500 MXN buy-in
      member.approvedAt = now;
      member.approvedByUserId = mockStore.season?.treasurerUserId ?? null;
      member.rejectionNote = null;
    } else {
      member.approvalStatus = 'rejected';
      member.rejectionNote = req.reviewNote ?? null;
    }

    return { submission, member };
  },

  // ---------------------------------------------------------------------------
  // Host order
  // ---------------------------------------------------------------------------

  async getHostOrder(seasonId: string) {
    await delay(200);
    const hostOrder = mockStore.hostOrder
      .filter((h) => h.seasonId === seasonId)
      .sort((a, b) => a.sortIndex - b.sortIndex);
    return { hostOrder };
  },

  async saveHostOrder(req) {
    await delay(400);
    const now = new Date().toISOString();

    const newOrder = req.userIds.map((userId, i) => ({
      id: makeId('01SH') + String(i).padStart(2, '0'),
      seasonId: req.seasonId,
      userId,
      sortIndex: i,
      updatedAt: now,
    }));

    mockStore.hostOrder = [
      ...mockStore.hostOrder.filter((h) => h.seasonId !== req.seasonId),
      ...newOrder,
    ];

    return { hostOrder: newOrder };
  },

  // ---------------------------------------------------------------------------
  // Season management
  // ---------------------------------------------------------------------------

  async updateTreasurer(req) {
    await delay(400);

    if (!mockStore.season || mockStore.season.id !== req.seasonId) {
      throw new Error('Season not found');
    }
    if (mockStore.season.status !== 'setup') {
      throw new Error('Can only change treasurer during setup');
    }

    mockStore.season.treasurerUserId = req.treasurerUserId;
    return { season: mockStore.season };
  },

  async startSeason(seasonId: string) {
    await delay(600);
    const now = new Date().toISOString();

    if (!mockStore.season || mockStore.season.id !== seasonId) {
      throw new Error('Season not found');
    }
    if (mockStore.season.status !== 'setup') {
      throw new Error('Season is not in setup status');
    }

    const approvedCount = mockStore.members.filter(
      (m) => m.seasonId === seasonId && m.approvalStatus === 'approved',
    ).length;

    if (approvedCount < 2) {
      throw new Error('At least 2 approved members required to start the season');
    }

    mockStore.season.status = 'active';
    mockStore.season.startedAt = now;

    return { season: mockStore.season };
  },

  // ---------------------------------------------------------------------------
  // Session scheduling
  // ---------------------------------------------------------------------------

  async scheduleSession(req) {
    await delay(500);
    const now = new Date().toISOString();

    if (!mockStore.season || mockStore.season.id !== req.seasonId) {
      throw new Error('Season not found');
    }
    if (mockStore.season.status !== 'active') {
      throw new Error('Season must be active to schedule a session');
    }
    if (mockStore.session && mockStore.session.state !== 'finalized') {
      throw new Error('A non-finalized session already exists');
    }

    const session = {
      id: makeId('01SS'),
      seasonId: req.seasonId,
      state: 'scheduled' as const,
      hostUserId: req.hostUserId,
      scheduledFor: req.scheduledFor ?? null,
      location: req.location ?? null,
      scheduledAt: now,
      scheduledByUserId: SEED_USERS[0].id, // mock assumes current user
      startedAt: null,
      startedByUserId: null,
      endedAt: null,
      endedByUserId: null,
      finalizedAt: null,
      finalizedByUserId: null,
    };

    mockStore.session = session;
    return { session };
  },

  async updateScheduledSession(req) {
    await delay(400);

    if (!mockStore.session || mockStore.session.id !== req.sessionId) {
      throw new Error('Session not found');
    }
    if (mockStore.session.state !== 'scheduled') {
      throw new Error('Can only edit a session in scheduled state');
    }

    if (req.hostUserId !== undefined) {
      mockStore.session.hostUserId = req.hostUserId;
    }
    if (req.scheduledFor !== undefined) {
      mockStore.session.scheduledFor = req.scheduledFor;
    }
    if (req.location !== undefined) {
      mockStore.session.location = req.location;
    }

    return { session: mockStore.session };
  },

  async startSession(sessionId: string) {
    await delay(500);
    const now = new Date().toISOString();

    if (!mockStore.session || mockStore.session.id !== sessionId) {
      throw new Error('Session not found');
    }
    if (mockStore.session.state !== 'scheduled') {
      throw new Error('Session must be in scheduled state to start');
    }

    mockStore.session.state = 'dealing';
    mockStore.session.startedAt = now;
    mockStore.session.startedByUserId = SEED_USERS[0].id; // mock assumes current user

    return { session: mockStore.session };
  },

  // ---------------------------------------------------------------------------
  // Session participants (dealing phase)
  // ---------------------------------------------------------------------------

  async getSessionParticipants(sessionId: string) {
    await delay(200);
    const participants = mockStore.sessionParticipants.filter(
      (p) => p.sessionId === sessionId && p.removedAt === null,
    );
    return { participants };
  },

  async checkInToSession(sessionId: string) {
    await delay(400);
    const now = new Date().toISOString();
    const currentUserId = SEED_USERS[0].id; // mock assumes current user (Edgar)

    if (!mockStore.session || mockStore.session.id !== sessionId) {
      throw new Error('Session not found');
    }
    if (mockStore.session.state !== 'dealing') {
      throw new Error('Session must be in dealing state to check in');
    }

    // Validate user is approved season member
    const member = mockStore.members.find(
      (m) => m.userId === currentUserId && m.approvalStatus === 'approved',
    );
    if (!member) {
      throw new Error('You must be an approved season member to check in');
    }

    // Validate not already checked in
    const existing = mockStore.sessionParticipants.find(
      (p) => p.sessionId === sessionId && p.userId === currentUserId && p.removedAt === null,
    );
    if (existing) {
      throw new Error('You are already checked in to this session');
    }

    const participant: import('@/types').SessionParticipant = {
      id: makeId('01SP'),
      sessionId,
      type: 'member',
      userId: currentUserId,
      guestName: null,
      startingStackCents: member.currentBalanceCents,
      checkedInAt: now,
      confirmedStartAt: null,
      startDisputeNote: null,
      removedAt: null,
      removedByUserId: null,
      createdAt: now,
    };

    mockStore.sessionParticipants.push(participant);
    // TODO: WebSocket broadcast — participant checked in
    return { participant };
  },

  async confirmStartingStack(sessionId: string, participantId: string) {
    await delay(300);
    const now = new Date().toISOString();

    const participant = mockStore.sessionParticipants.find(
      (p) => p.id === participantId && p.sessionId === sessionId && p.removedAt === null,
    );
    if (!participant) throw new Error('Participant not found');
    if (!participant.checkedInAt) throw new Error('Participant has not checked in');
    if (participant.confirmedStartAt) throw new Error('Already confirmed');

    participant.confirmedStartAt = now;
    participant.startDisputeNote = null; // clear any previous dispute
    // TODO: WebSocket broadcast — participant confirmed
    return { participant };
  },

  async disputeStartingStack(req) {
    await delay(300);

    const participant = mockStore.sessionParticipants.find(
      (p) => p.id === req.participantId && p.sessionId === req.sessionId && p.removedAt === null,
    );
    if (!participant) throw new Error('Participant not found');
    if (!participant.checkedInAt) throw new Error('Participant has not checked in');

    participant.startDisputeNote = req.note;
    participant.confirmedStartAt = null; // un-confirm if was confirmed
    // TODO: WebSocket broadcast — participant disputed
    return { participant };
  },

  async removeParticipant(sessionId: string, participantId: string) {
    await delay(300);
    const now = new Date().toISOString();

    const participant = mockStore.sessionParticipants.find(
      (p) => p.id === participantId && p.sessionId === sessionId && p.removedAt === null,
    );
    if (!participant) throw new Error('Participant not found');

    participant.removedAt = now;
    participant.removedByUserId = SEED_USERS[0].id; // mock assumes current user
    // TODO: WebSocket broadcast — participant removed
    return { participant };
  },

  async moveSessionToInProgress(sessionId: string) {
    await delay(500);
    const now = new Date().toISOString();

    if (!mockStore.session || mockStore.session.id !== sessionId) {
      throw new Error('Session not found');
    }
    if (mockStore.session.state !== 'dealing') {
      throw new Error('Session must be in dealing state');
    }

    const active = mockStore.sessionParticipants.filter(
      (p) => p.sessionId === sessionId && p.removedAt === null,
    );
    const checkedIn = active.filter((p) => p.checkedInAt !== null);

    if (checkedIn.length < 2) {
      throw new Error('At least 2 checked-in participants required');
    }

    const unconfirmed = checkedIn.filter((p) => p.confirmedStartAt === null);
    if (unconfirmed.length > 0) {
      throw new Error(`${unconfirmed.length} participant(s) have not confirmed their starting stack`);
    }

    const disputed = checkedIn.filter((p) => p.startDisputeNote !== null);
    if (disputed.length > 0) {
      throw new Error(`${disputed.length} participant(s) have unresolved disputes`);
    }

    mockStore.session.state = 'in_progress';
    mockStore.session.startedAt = mockStore.session.startedAt ?? now;
    // TODO: WebSocket broadcast — session moved to in_progress

    return { session: mockStore.session };
  },

  // ---------------------------------------------------------------------------
  // Session injections (rebuys — in_progress phase)
  // ---------------------------------------------------------------------------

  async getSessionInjections(sessionId: string) {
    await delay(200);
    const injections = mockStore.sessionInjections.filter(
      (inj) => inj.sessionId === sessionId,
    );
    return { injections };
  },

  async requestRebuy(req) {
    await delay(400);
    const now = new Date().toISOString();
    const currentUserId = SEED_USERS[0].id; // mock assumes current user (Edgar)

    if (!mockStore.session || mockStore.session.id !== req.sessionId) {
      throw new Error('Session not found');
    }
    if (mockStore.session.state !== 'in_progress') {
      throw new Error('Rebuys can only be requested while the session is in progress');
    }

    // Find participant record for current user
    const participant = mockStore.sessionParticipants.find(
      (p) => p.sessionId === req.sessionId && p.userId === currentUserId && p.removedAt === null,
    );
    if (!participant) {
      throw new Error('You must be a session participant to request a rebuy');
    }

    const amountCents = req.type === 'rebuy_500' ? 50000 : req.type === 'half_250' ? 25000 : 50000;

    const injection: import('@/types').SessionInjection = {
      id: makeId('01SI'),
      sessionId: req.sessionId,
      participantId: participant.id,
      type: req.type,
      amountCents,
      requestedByUserId: currentUserId,
      requestedAt: now,
      proofPhotoUrl: req.proofPhotoUrl ?? null,
      status: 'pending',
      reviewedAt: null,
      reviewedByUserId: null,
      reviewNote: null,
      createdAt: now,
    };

    mockStore.sessionInjections.push(injection);
    // TODO: WebSocket broadcast — rebuy requested
    return { injection };
  },

  async reviewInjection(req) {
    await delay(400);
    const now = new Date().toISOString();

    const injection = mockStore.sessionInjections.find((inj) => inj.id === req.injectionId);
    if (!injection) throw new Error('Injection not found');
    if (injection.status !== 'pending') throw new Error('Injection already reviewed');

    if (!mockStore.session || mockStore.session.state !== 'in_progress') {
      throw new Error('Rebuys can only be reviewed while the session is in progress');
    }

    injection.status = req.action === 'approve' ? 'approved' : 'rejected';
    injection.reviewedAt = now;
    injection.reviewedByUserId = SEED_USERS[0].id; // mock assumes current user
    injection.reviewNote = req.reviewNote ?? null;

    // TODO: WebSocket broadcast — rebuy reviewed
    return { injection };
  },

  async endSession(sessionId: string) {
    await delay(500);
    const now = new Date().toISOString();

    if (!mockStore.session || mockStore.session.id !== sessionId) {
      throw new Error('Session not found');
    }
    if (mockStore.session.state !== 'in_progress') {
      throw new Error('Session must be in progress to end');
    }

    mockStore.session.state = 'closing';
    mockStore.session.endedAt = now;
    mockStore.session.endedByUserId = SEED_USERS[0].id; // mock assumes current user
    // TODO: WebSocket broadcast — session ended

    return { session: mockStore.session };
  },

  // ---------------------------------------------------------------------------
  // Ending submissions (closing phase)
  // ---------------------------------------------------------------------------

  async getEndingSubmissions(sessionId: string) {
    await delay(200);
    const submissions = mockStore.endingSubmissions.filter(
      (s) => s.sessionId === sessionId,
    );
    return { submissions };
  },

  async submitEndingStack(req) {
    await delay(400);
    const now = new Date().toISOString();

    if (!mockStore.session || mockStore.session.id !== req.sessionId) {
      throw new Error('Session not found');
    }
    if (mockStore.session.state !== 'closing') {
      throw new Error('Ending stacks can only be submitted while the session is closing');
    }

    const participant = mockStore.sessionParticipants.find(
      (p) => p.id === req.participantId && p.sessionId === req.sessionId && p.removedAt === null,
    );
    if (!participant) {
      throw new Error('Participant not found or has been removed');
    }

    const submission: import('@/types').EndingSubmission = {
      id: makeId('01ES'),
      sessionId: req.sessionId,
      participantId: req.participantId,
      endingStackCents: req.endingStackCents,
      photoUrl: req.photoUrl,
      submittedAt: now,
      submittedByUserId: req.submittedByUserId ?? SEED_USERS[0].id,
      note: req.note ?? null,
      status: 'pending',
      reviewedAt: null,
      reviewedByUserId: null,
      reviewNote: null,
      createdAt: now,
    };

    mockStore.endingSubmissions.push(submission);
    // TODO: WebSocket broadcast — ending stack submitted
    return { submission };
  },

  async reviewEndingSubmission(req) {
    await delay(400);
    const now = new Date().toISOString();

    const submission = mockStore.endingSubmissions.find((s) => s.id === req.submissionId);
    if (!submission) throw new Error('Submission not found');
    if (submission.status !== 'pending') throw new Error('Submission already reviewed');

    if (!mockStore.session || mockStore.session.state !== 'closing') {
      throw new Error('Submissions can only be reviewed while the session is closing');
    }

    if (req.action === 'reject' && !req.reviewNote?.trim()) {
      throw new Error('Rejection requires a review note');
    }

    submission.status = req.action === 'validate' ? 'validated' : 'rejected';
    submission.reviewedAt = now;
    submission.reviewedByUserId = SEED_USERS[0].id; // mock assumes current user
    submission.reviewNote = req.reviewNote ?? null;

    // TODO: WebSocket broadcast — ending submission reviewed
    return { submission };
  },
};
