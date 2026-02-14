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
};
