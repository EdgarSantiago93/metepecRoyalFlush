import { mockStore } from '@/data/seed-seasons';
import { httpAuth } from './http-auth-client';
import { httpSeason } from './http-season-client';
import type { ApiClient } from './types';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Authenticated user tracking (used by mock non-auth methods)
// ---------------------------------------------------------------------------

let _currentUserId: string | null = null;

export function setCurrentUserId(id: string | null): void {
  _currentUserId = id;
}

function getCurrentUserId(): string {
  if (!_currentUserId) throw new Error('No authenticated user');
  return _currentUserId;
}

function makeId(prefix: string): string {
  return `${prefix}${Date.now().toString(36).padStart(22, '0')}`.slice(0, 26);
}

/**
 * Hybrid API client: real HTTP for auth + season + session operations,
 * mock for payouts (backend TBD) and getActiveSession.
 */
const mockApi: Omit<ApiClient,
  | 'sendMagicLink' | 'verifyMagicLink' | 'getMe' | 'updateBankingInfo' | 'updateAvatar'
  | 'getActiveSeason' | 'getUsers' | 'createSeason' | 'updateSeasonName' | 'updateTreasurer'
  | 'startSeason' | 'endSeason' | 'getHostOrder' | 'saveHostOrder'
  | 'submitDeposit' | 'getDepositSubmissions' | 'reviewDeposit'
  | 'scheduleSession' | 'getSessionDetail'
  | 'updateScheduledSession' | 'startSession' | 'moveSessionToInProgress' | 'endSession'
  | 'getSessionParticipants' | 'checkInToSession' | 'confirmStartingStack'
  | 'disputeStartingStack' | 'removeParticipant' | 'addGuest'
  | 'getSessionInjections' | 'requestRebuy' | 'reviewInjection'
  | 'getEndingSubmissions' | 'submitEndingStack' | 'reviewEndingSubmission'
  | 'finalizeSession' | 'getSessionFinalizeNote'
  | 'getSeasonSessions'
> = {
  async getActiveSession() {
    await delay(200);
    return { session: mockStore.session };
  },

  // ---------------------------------------------------------------------------
  // Payouts (mock — backend TBD)
  // ---------------------------------------------------------------------------

  async getPayouts(seasonId: string) {
    await delay(300);
    const payouts = mockStore.payouts.filter((p) => p.seasonId === seasonId);
    return { payouts };
  },

  async sendPayout(req) {
    await delay(500);
    const now = new Date().toISOString();

    if (!mockStore.season || mockStore.season.id !== req.seasonId) {
      throw new Error('Season not found');
    }
    if (mockStore.season.status !== 'ended') {
      throw new Error('Season must be ended to send payouts');
    }

    // Check if payout already exists for this user
    const existing = mockStore.payouts.find(
      (p) => p.seasonId === req.seasonId && p.toUserId === req.toUserId,
    );
    if (existing) {
      throw new Error('Payout already exists for this player');
    }

    const payout: import('@/types').SeasonPayout = {
      id: makeId('01PY'),
      seasonId: req.seasonId,
      fromUserId: getCurrentUserId(),
      toUserId: req.toUserId,
      amountCents: req.amountCents,
      status: 'pending',
      proofMediaKey: req.proofMediaKey ?? null,
      note: req.note ?? null,
      confirmedAt: null,
      disputedAt: null,
      disputeNote: null,
      resolvedAt: null,
      createdAt: now,
    };

    mockStore.payouts.push(payout);
    return { payout };
  },

  async confirmPayout(payoutId: string) {
    await delay(400);
    const now = new Date().toISOString();

    const payout = mockStore.payouts.find((p) => p.id === payoutId);
    if (!payout) throw new Error('Payout not found');
    if (payout.status !== 'pending') throw new Error('Payout must be pending to confirm');

    payout.status = 'confirmed';
    payout.confirmedAt = now;

    return { payout };
  },

  async disputePayout(req) {
    await delay(400);
    const now = new Date().toISOString();

    const payout = mockStore.payouts.find((p) => p.id === req.payoutId);
    if (!payout) throw new Error('Payout not found');
    if (payout.status !== 'pending') throw new Error('Payout must be pending to dispute');

    payout.status = 'disputed';
    payout.disputedAt = now;
    payout.disputeNote = req.disputeNote;

    return { payout };
  },

  async resolvePayout(payoutId: string) {
    await delay(400);
    const now = new Date().toISOString();

    const payout = mockStore.payouts.find((p) => p.id === payoutId);
    if (!payout) throw new Error('Payout not found');
    if (payout.status !== 'disputed') throw new Error('Payout must be disputed to resolve');

    payout.status = 'confirmed';
    payout.confirmedAt = now;
    payout.resolvedAt = now;

    return { payout };
  },
};

export const api: ApiClient = {
  ...httpAuth,
  ...httpSeason,
  ...mockApi,
};
