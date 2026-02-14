import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { Season, SeasonMember, Session, User } from '@/types';
import type { CreateSeasonRequest, ScheduleSessionRequest, UpdateScheduledSessionRequest } from '@/services/api/types';
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
  | { status: 'season_active'; season: Season; members: SeasonMember[]; session: Session | null; users: User[] }
  | { status: 'season_ended'; season: Season; members: SeasonMember[]; users: User[] };

export type AppStateContextValue = AppState & {
  createSeason: (req: CreateSeasonRequest) => Promise<void>;
  startSeason: () => Promise<void>;
  updateTreasurer: (userId: string) => Promise<void>;
  scheduleSession: (req: ScheduleSessionRequest) => Promise<void>;
  updateScheduledSession: (req: UpdateScheduledSessionRequest) => Promise<void>;
  startSession: () => Promise<void>;
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
        setState({ status: 'season_active', season, members, session, users });
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
      refresh: load,
      _devSetPreset,
    }),
    [state, createSeason, startSeason, updateTreasurer, scheduleSession, updateScheduledSession, startSession, load, _devSetPreset],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
