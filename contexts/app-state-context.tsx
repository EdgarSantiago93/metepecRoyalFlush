import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Toast from 'react-native-simple-toast';
import type { EndingSubmission, Season, SeasonHostOrder, SeasonMember, SeasonPayout, Session, SessionFinalizeNote, SessionInjection, SessionParticipant, User } from '@/types';
import type { InjectionType } from '@/types/models/session';
import type { CreateSeasonRequest, DisputeStartRequest, ScheduleSessionRequest, SendPayoutRequest, UpdateBankingInfoRequest, UpdateScheduledSessionRequest } from '@/services/api/types';
import { api } from '@/services/api/client';
import { applyPreset, type PresetKey } from '@/data/seed-seasons';

function showErrorToast(err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : fallback;
  Toast.showWithGravity(msg, Toast.SHORT, Toast.TOP);
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type AppState =
  | { status: 'loading'; _devPresetKey?: PresetKey | null }
  | { status: 'error'; message: string; _devPresetKey?: PresetKey | null }
  | { status: 'no_season'; users: User[]; _devPresetKey?: PresetKey | null }
  | { status: 'season_setup'; season: Season; members: SeasonMember[]; users: User[]; _devPresetKey?: PresetKey | null }
  | { status: 'season_active'; season: Season; members: SeasonMember[]; hostOrder: SeasonHostOrder[]; session: Session | null; participants: SessionParticipant[]; injections: SessionInjection[]; endingSubmissions: EndingSubmission[]; finalizeNote: SessionFinalizeNote | null; users: User[]; _devPresetKey?: PresetKey | null }
  | { status: 'season_ended'; season: Season; members: SeasonMember[]; users: User[]; payouts: SeasonPayout[]; _devPresetKey?: PresetKey | null };

export type AppStateContextValue = AppState & {
  createSeason: (req: CreateSeasonRequest) => Promise<void>;
  startSeason: () => Promise<void>;
  updateSeasonName: (name: string) => Promise<void>;
  updateTreasurer: (userId: string) => Promise<void>;
  scheduleSession: (req: ScheduleSessionRequest) => Promise<void>;
  updateScheduledSession: (req: UpdateScheduledSessionRequest) => Promise<void>;
  startSession: () => Promise<void>;
  checkIn: () => Promise<void>;
  confirmStart: (participantId: string) => Promise<void>;
  disputeStart: (participantId: string, note: string) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  addGuest: (guestName: string) => Promise<void>;
  moveToInProgress: () => Promise<void>;
  refreshParticipants: () => Promise<void>;
  requestRebuy: (type: InjectionType, proofMediaKey?: string) => Promise<void>;
  reviewInjection: (injectionId: string, action: 'approve' | 'reject', note?: string) => Promise<void>;
  endSession: () => Promise<void>;
  refreshInjections: () => Promise<void>;
  submitEndingStack: (participantId: string, endingStackCents: number, mediaKey: string, note?: string) => Promise<void>;
  reviewEndingSubmission: (submissionId: string, action: 'validate' | 'reject', note?: string) => Promise<void>;
  refreshEndingSubmissions: () => Promise<void>;
  finalizeSession: (overrideNote?: string) => Promise<void>;
  endSeason: () => Promise<void>;
  sendPayout: (req: SendPayoutRequest) => Promise<void>;
  confirmPayout: (payoutId: string) => Promise<void>;
  disputePayout: (payoutId: string, note: string) => Promise<void>;
  resolvePayout: (payoutId: string) => Promise<void>;
  updateBankingInfo: (req: UpdateBankingInfoRequest) => Promise<void>;
  refreshPayouts: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshIfStale: (thresholdMs: number) => void;
  _devSetPreset: (key: PresetKey) => Promise<void>;
};

export const AppStateContext = createContext<AppStateContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveUsers(members: SeasonMember[]): User[] {
  const seen = new Set<string>();
  const users: User[] = [];
  for (const m of members) {
    if (!m.user || seen.has(m.user.id)) continue;
    seen.add(m.user.id);
    users.push({
      id: m.user.id,
      email: m.user.email,
      displayName: m.user.displayName,
      isAdmin: m.user.isAdmin,
      avatarUrl: null,
      bankingNombre: null,
      bankingCuenta: null,
      bankingBanco: null,
      bankingClabe: null,
      createdAt: '',
    });
  }
  return users;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({ status: 'loading' });
  const devPresetKeyRef = useRef<PresetKey | null>(null);
  const lastFetchedAtRef = useRef<number>(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const _devPresetKey = devPresetKeyRef.current;
    if (!opts?.silent) {
      setState({ status: 'loading', _devPresetKey });
    }
    try {
      const { season, members, hostOrder, currentSession } = await api.getActiveSeason();

      if (!season) {
        const usersRes = await api.getUsers();
        setState({ status: 'no_season', users: usersRes.users, _devPresetKey });
      } else if (season.status === 'setup') {
        setState({ status: 'season_setup', season, members, users: deriveUsers(members), _devPresetKey });
      } else if (season.status === 'active') {
        setState({
          status: 'season_active',
          season,
          members,
          hostOrder,
          session: currentSession?.session ?? null,
          participants: currentSession?.participants ?? [],
          injections: currentSession?.injections ?? [],
          endingSubmissions: currentSession?.endingSubmissions ?? [],
          finalizeNote: currentSession?.finalizeNote ?? null,
          users: deriveUsers(members),
          _devPresetKey,
        });
      } else {
        const payoutsRes = await api.getPayouts(season.id);
        setState({ status: 'season_ended', season, members, users: deriveUsers(members), payouts: payoutsRes.payouts, _devPresetKey });
      }
      lastFetchedAtRef.current = Date.now();
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load app state',
        _devPresetKey,
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createSeason = useCallback(
    async (req: CreateSeasonRequest) => {
      try {
        await api.createSeason(req);
        await load();
      } catch (err) {
        showErrorToast(err, 'No se pudo crear la temporada');
        throw err;
      }
    },
    [load],
  );

  const startSeason = useCallback(async () => {
    if (state.status !== 'season_setup') return;
    try {
      await api.startSeason(state.season.id);
      await load();
    } catch (err) {
      showErrorToast(err, 'No se pudo iniciar la temporada');
      throw err;
    }
  }, [state, load]);

  const updateSeasonName = useCallback(
    async (name: string) => {
      if (state.status !== 'season_setup' && state.status !== 'season_active') return;
      try {
        const { season } = await api.updateSeasonName({ seasonId: state.season.id, name });
        setState((prev) => {
          if (prev.status !== 'season_setup' && prev.status !== 'season_active') return prev;
          return { ...prev, season };
        });
      } catch (err) {
        showErrorToast(err, 'No se pudo actualizar el nombre');
        throw err;
      }
    },
    [state],
  );

  const updateTreasurer = useCallback(
    async (userId: string) => {
      if (state.status !== 'season_setup') return;
      try {
        await api.updateTreasurer({ seasonId: state.season.id, treasurerUserId: userId });
        await load();
      } catch (err) {
        showErrorToast(err, 'No se pudo cambiar el tesorero');
        throw err;
      }
    },
    [state, load],
  );

  const scheduleSession = useCallback(
    async (req: ScheduleSessionRequest) => {
      if (state.status !== 'season_active') return;
      await api.scheduleSession(req);
      await load();
    },
    [state, load],
  );

  const updateScheduledSession = useCallback(
    async (req: UpdateScheduledSessionRequest) => {
      if (state.status !== 'season_active') return;
      await api.updateScheduledSession(req);
      await load();
    },
    [state, load],
  );

  const startSession = useCallback(async () => {
    if (state.status !== 'season_active' || !state.session) return;
    await api.startSession(state.session.id);
    await load();
  }, [state, load]);

  // ---------------------------------------------------------------------------
  // Participant actions — refresh participants only (no full reload)
  // ---------------------------------------------------------------------------

  const refreshParticipants = useCallback(async () => {
    // TODO: WebSocket — replace polling with real-time updates
    if (state.status !== 'season_active' || !state.session) return;
    const { participants } = await api.getSessionParticipants(state.session.id);
    setState((prev) => {
      if (prev.status !== 'season_active') return prev;
      return { ...prev, participants };
    });
  }, [state]);

  const checkIn = useCallback(async () => {
    if (state.status !== 'season_active' || !state.session) return;
    await api.checkInToSession(state.session.id);
    const { participants } = await api.getSessionParticipants(state.session.id);
    setState((prev) => {
      if (prev.status !== 'season_active') return prev;
      return { ...prev, participants };
    });
  }, [state]);

  const confirmStart = useCallback(
    async (participantId: string) => {
      if (state.status !== 'season_active' || !state.session) return;
      await api.confirmStartingStack(state.session.id, participantId);
      const { participants } = await api.getSessionParticipants(state.session.id);
      setState((prev) => {
        if (prev.status !== 'season_active') return prev;
        return { ...prev, participants };
      });
    },
    [state],
  );

  const disputeStart = useCallback(
    async (participantId: string, note: string) => {
      if (state.status !== 'season_active' || !state.session) return;
      await api.disputeStartingStack({
        sessionId: state.session.id,
        participantId,
        note,
      } satisfies DisputeStartRequest);
      const { participants } = await api.getSessionParticipants(state.session.id);
      setState((prev) => {
        if (prev.status !== 'season_active') return prev;
        return { ...prev, participants };
      });
    },
    [state],
  );

  const removeParticipant = useCallback(
    async (participantId: string) => {
      if (state.status !== 'season_active' || !state.session) return;
      await api.removeParticipant(state.session.id, participantId);
      const [partRes, injRes] = await Promise.all([
        api.getSessionParticipants(state.session.id),
        api.getSessionInjections(state.session.id),
      ]);
      setState((prev) => {
        if (prev.status !== 'season_active') return prev;
        return { ...prev, participants: partRes.participants, injections: injRes.injections };
      });
    },
    [state],
  );

  const addGuest = useCallback(
    async (guestName: string) => {
      if (state.status !== 'season_active' || !state.session) return;
      const { participant, injection } = await api.addGuest({
        sessionId: state.session.id,
        guestName,
      });
      setState((prev) => {
        if (prev.status !== 'season_active') return prev;
        return {
          ...prev,
          participants: [...prev.participants, participant],
          injections: [...prev.injections, injection],
        };
      });
    },
    [state],
  );

  const moveToInProgress = useCallback(async () => {
    if (state.status !== 'season_active' || !state.session) return;
    await api.moveSessionToInProgress(state.session.id);
    await load(); // full reload — session state changes
  }, [state, load]);

  // ---------------------------------------------------------------------------
  // Injection actions — refresh injections only (no full reload)
  // ---------------------------------------------------------------------------

  const refreshInjections = useCallback(async () => {
    // TODO: WebSocket — replace polling with real-time updates
    if (state.status !== 'season_active' || !state.session) return;
    const { injections } = await api.getSessionInjections(state.session.id);
    setState((prev) => {
      if (prev.status !== 'season_active') return prev;
      return { ...prev, injections };
    });
  }, [state]);

  const requestRebuy = useCallback(
    async (type: InjectionType, proofMediaKey?: string) => {
      if (state.status !== 'season_active' || !state.session) return;
      await api.requestRebuy({ sessionId: state.session.id, type, proofMediaKey });
      const { injections } = await api.getSessionInjections(state.session.id);
      setState((prev) => {
        if (prev.status !== 'season_active') return prev;
        return { ...prev, injections };
      });
    },
    [state],
  );

  const reviewInjection = useCallback(
    async (injectionId: string, action: 'approve' | 'reject', note?: string) => {
      if (state.status !== 'season_active' || !state.session) return;
      await api.reviewInjection({ injectionId, action, reviewNote: note });
      const { injections } = await api.getSessionInjections(state.session.id);
      setState((prev) => {
        if (prev.status !== 'season_active') return prev;
        return { ...prev, injections };
      });
    },
    [state],
  );

  const endSession = useCallback(async () => {
    if (state.status !== 'season_active' || !state.session) return;
    await api.endSession(state.session.id);
    await load(); // full reload — session state changes
  }, [state, load]);

  // ---------------------------------------------------------------------------
  // Ending submission actions — refresh submissions only (no full reload)
  // ---------------------------------------------------------------------------

  const refreshEndingSubmissions = useCallback(async () => {
    // TODO: WebSocket — replace polling with real-time updates
    if (state.status !== 'season_active' || !state.session) return;
    const { submissions } = await api.getEndingSubmissions(state.session.id);
    setState((prev) => {
      if (prev.status !== 'season_active') return prev;
      return { ...prev, endingSubmissions: submissions };
    });
  }, [state]);

  const submitEndingStack = useCallback(
    async (participantId: string, endingStackCents: number, mediaKey: string, note?: string) => {
      if (state.status !== 'season_active' || !state.session) return;
      await api.submitEndingStack({
        sessionId: state.session.id,
        participantId,
        endingStackCents,
        mediaKey,
        note,
      });
      const { submissions } = await api.getEndingSubmissions(state.session.id);
      setState((prev) => {
        if (prev.status !== 'season_active') return prev;
        return { ...prev, endingSubmissions: submissions };
      });
    },
    [state],
  );

  const reviewEndingSubmission = useCallback(
    async (submissionId: string, action: 'validate' | 'reject', note?: string) => {
      if (state.status !== 'season_active' || !state.session) return;
      await api.reviewEndingSubmission({ submissionId, action, reviewNote: note });
      const { submissions } = await api.getEndingSubmissions(state.session.id);
      setState((prev) => {
        if (prev.status !== 'season_active') return prev;
        return { ...prev, endingSubmissions: submissions };
      });
    },
    [state],
  );

  // ---------------------------------------------------------------------------
  // Finalization actions
  // ---------------------------------------------------------------------------

  const finalizeSession = useCallback(
    async (overrideNote?: string) => {
      if (state.status !== 'season_active' || !state.session) return;
      await api.finalizeSession({
        sessionId: state.session.id,
        overrideNote,
      });
      await load(); // full reload — session state changes, members updated
    },
    [state, load],
  );

  const endSeason = useCallback(async () => {
    if (state.status !== 'season_active') return;
    try {
      await api.endSeason({ seasonId: state.season.id });
      await load();
    } catch (err) {
      showErrorToast(err, 'No se pudo terminar la temporada');
      throw err;
    }
  }, [state, load]);

  // ---------------------------------------------------------------------------
  // Payout actions
  // ---------------------------------------------------------------------------

  const sendPayout = useCallback(
    async (req: SendPayoutRequest) => {
      if (state.status !== 'season_ended') return;
      await api.sendPayout(req);
      const { payouts } = await api.getPayouts(state.season.id);
      setState((prev) => {
        if (prev.status !== 'season_ended') return prev;
        return { ...prev, payouts };
      });
    },
    [state],
  );

  const confirmPayout = useCallback(
    async (payoutId: string) => {
      if (state.status !== 'season_ended') return;
      await api.confirmPayout(payoutId);
      const { payouts } = await api.getPayouts(state.season.id);
      setState((prev) => {
        if (prev.status !== 'season_ended') return prev;
        return { ...prev, payouts };
      });
    },
    [state],
  );

  const disputePayout = useCallback(
    async (payoutId: string, note: string) => {
      if (state.status !== 'season_ended') return;
      await api.disputePayout({ payoutId, disputeNote: note });
      const { payouts } = await api.getPayouts(state.season.id);
      setState((prev) => {
        if (prev.status !== 'season_ended') return prev;
        return { ...prev, payouts };
      });
    },
    [state],
  );

  const resolvePayout = useCallback(
    async (payoutId: string) => {
      if (state.status !== 'season_ended') return;
      await api.resolvePayout(payoutId);
      const { payouts } = await api.getPayouts(state.season.id);
      setState((prev) => {
        if (prev.status !== 'season_ended') return prev;
        return { ...prev, payouts };
      });
    },
    [state],
  );

  const updateBankingInfo = useCallback(
    async (req: UpdateBankingInfoRequest) => {
      await api.updateBankingInfo(req);
      const usersRes = await api.getUsers();
      setState((prev) => ({ ...prev, users: usersRes.users }));
    },
    [],
  );

  const refreshPayouts = useCallback(async () => {
    if (state.status !== 'season_ended') return;
    const { payouts } = await api.getPayouts(state.season.id);
    setState((prev) => {
      if (prev.status !== 'season_ended') return prev;
      return { ...prev, payouts };
    });
  }, [state]);

  const _devSetPreset = useCallback(
    async (key: PresetKey) => {
      devPresetKeyRef.current = key;
      applyPreset(key);
      await load();
    },
    [load],
  );

  const refreshIfStale = useCallback(
    (thresholdMs: number) => {
      if (Date.now() - lastFetchedAtRef.current > thresholdMs) {
        load({ silent: true });
      }
    },
    [load],
  );

  const value = useMemo<AppStateContextValue>(
    () => ({
      ...state,
      createSeason,
      startSeason,
      updateSeasonName,
      updateTreasurer,
      scheduleSession,
      updateScheduledSession,
      startSession,
      checkIn,
      confirmStart,
      disputeStart,
      removeParticipant,
      addGuest,
      moveToInProgress,
      refreshParticipants,
      requestRebuy,
      reviewInjection,
      endSession,
      refreshInjections,
      submitEndingStack,
      reviewEndingSubmission,
      refreshEndingSubmissions,
      finalizeSession,
      endSeason,
      sendPayout,
      confirmPayout,
      disputePayout,
      resolvePayout,
      updateBankingInfo,
      refreshPayouts,
      refresh: load,
      refreshIfStale,
      _devSetPreset,
    }),
    [state, createSeason, startSeason, updateSeasonName, updateTreasurer, scheduleSession, updateScheduledSession, startSession, checkIn, confirmStart, disputeStart, removeParticipant, addGuest, moveToInProgress, refreshParticipants, requestRebuy, reviewInjection, endSession, refreshInjections, submitEndingStack, reviewEndingSubmission, refreshEndingSubmissions, finalizeSession, endSeason, sendPayout, confirmPayout, disputePayout, resolvePayout, updateBankingInfo, refreshPayouts, load, refreshIfStale, _devSetPreset],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
