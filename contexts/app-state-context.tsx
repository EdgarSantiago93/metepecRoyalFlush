import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { Season, SeasonMember, Session, SessionInjection, SessionParticipant, User } from '@/types';
import type { InjectionType } from '@/types/models/session';
import type { CreateSeasonRequest, DisputeStartRequest, ScheduleSessionRequest, UpdateScheduledSessionRequest } from '@/services/api/types';
import { api } from '@/services/api/client';
import { applyPreset, type PresetKey } from '@/data/seed-seasons';

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type AppState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'no_season'; users: User[] }
  | { status: 'season_setup'; season: Season; members: SeasonMember[]; users: User[] }
  | { status: 'season_active'; season: Season; members: SeasonMember[]; session: Session | null; participants: SessionParticipant[]; injections: SessionInjection[]; users: User[] }
  | { status: 'season_ended'; season: Season; members: SeasonMember[]; users: User[] };

export type AppStateContextValue = AppState & {
  createSeason: (req: CreateSeasonRequest) => Promise<void>;
  startSeason: () => Promise<void>;
  updateTreasurer: (userId: string) => Promise<void>;
  scheduleSession: (req: ScheduleSessionRequest) => Promise<void>;
  updateScheduledSession: (req: UpdateScheduledSessionRequest) => Promise<void>;
  startSession: () => Promise<void>;
  checkIn: () => Promise<void>;
  confirmStart: (participantId: string) => Promise<void>;
  disputeStart: (participantId: string, note: string) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  moveToInProgress: () => Promise<void>;
  refreshParticipants: () => Promise<void>;
  requestRebuy: (type: InjectionType, proofPhotoUrl?: string) => Promise<void>;
  reviewInjection: (injectionId: string, action: 'approve' | 'reject', note?: string) => Promise<void>;
  endSession: () => Promise<void>;
  refreshInjections: () => Promise<void>;
  refresh: () => Promise<void>;
  _devSetPreset: (key: PresetKey) => Promise<void>;
};

export const AppStateContext = createContext<AppStateContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const [seasonRes, sessionRes, usersRes] = await Promise.all([
        api.getActiveSeason(),
        api.getActiveSession(),
        api.getUsers(),
      ]);

      const { season, members } = seasonRes;
      const { session } = sessionRes;
      const { users } = usersRes;

      if (!season) {
        setState({ status: 'no_season', users });
      } else if (season.status === 'setup') {
        setState({ status: 'season_setup', season, members, users });
      } else if (season.status === 'active') {
        // Fetch participants when session is in dealing or in_progress state
        let participants: SessionParticipant[] = [];
        let injections: SessionInjection[] = [];
        if (session && (session.state === 'dealing' || session.state === 'in_progress')) {
          const partRes = await api.getSessionParticipants(session.id);
          participants = partRes.participants;
        }
        if (session && session.state === 'in_progress') {
          const injRes = await api.getSessionInjections(session.id);
          injections = injRes.injections;
        }
        setState({ status: 'season_active', season, members, session, participants, injections, users });
      } else {
        setState({ status: 'season_ended', season, members, users });
      }
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load app state',
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createSeason = useCallback(
    async (req: CreateSeasonRequest) => {
      const { season, members } = await api.createSeason(req);
      const usersRes = await api.getUsers();
      setState({ status: 'season_setup', season, members, users: usersRes.users });
    },
    [],
  );

  const startSeason = useCallback(async () => {
    if (state.status !== 'season_setup') return;
    await api.startSeason(state.season.id);
    await load();
  }, [state, load]);

  const updateTreasurer = useCallback(
    async (userId: string) => {
      if (state.status !== 'season_setup') return;
      await api.updateTreasurer({ seasonId: state.season.id, treasurerUserId: userId });
      await load();
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
      const { participants } = await api.getSessionParticipants(state.session.id);
      setState((prev) => {
        if (prev.status !== 'season_active') return prev;
        return { ...prev, participants };
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
    async (type: InjectionType, proofPhotoUrl?: string) => {
      if (state.status !== 'season_active' || !state.session) return;
      await api.requestRebuy({ sessionId: state.session.id, type, proofPhotoUrl });
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

  const _devSetPreset = useCallback(
    async (key: PresetKey) => {
      applyPreset(key);
      await load();
    },
    [load],
  );

  const value = useMemo<AppStateContextValue>(
    () => ({
      ...state,
      createSeason,
      startSeason,
      updateTreasurer,
      scheduleSession,
      updateScheduledSession,
      startSession,
      checkIn,
      confirmStart,
      disputeStart,
      removeParticipant,
      moveToInProgress,
      refreshParticipants,
      requestRebuy,
      reviewInjection,
      endSession,
      refreshInjections,
      refresh: load,
      _devSetPreset,
    }),
    [state, createSeason, startSeason, updateTreasurer, scheduleSession, updateScheduledSession, startSession, checkIn, confirmStart, disputeStart, removeParticipant, moveToInProgress, refreshParticipants, requestRebuy, reviewInjection, endSession, refreshInjections, load, _devSetPreset],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
