import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Loader } from '@/components/ui/loader';
import { ErrorView } from '@/components/ui/error-view';
import { LedgerPlayerDetail } from '@/components/ledger/ledger-player-detail';
import { api } from '@/services/api/client';
import { useAppState } from '@/hooks/use-app-state';
import type { Session, User, SeasonMember } from '@/types';
import type { GetSessionDetailResponse } from '@/services/api/types';

export default function LedgerPlayerDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const appState = useAppState();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionDetails, setSessionDetails] = useState<GetSessionDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const users: User[] = appState.status !== 'loading' && appState.status !== 'error' && 'users' in appState ? appState.users : [];
  const members: SeasonMember[] = appState.status !== 'loading' && appState.status !== 'error' && 'members' in appState ? appState.members : [];
  const season = appState.status !== 'loading' && appState.status !== 'error' && 'season' in appState ? appState.season : null;

  const loadData = useCallback(async () => {
    if (!userId || !season) return;
    try {
      setLoading(true);
      setError(null);
      const sessionsRes = await api.getSeasonSessions(season.id);
      const finalizedSessions = sessionsRes.sessions.filter((s) => s.state === 'finalized');
      setSessions(finalizedSessions);

      // Fetch details for all finalized sessions
      const details = await Promise.all(
        finalizedSessions.map((s) => api.getSessionDetail(s.id)),
      );
      setSessionDetails(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos del jugador');
    } finally {
      setLoading(false);
    }
  }, [userId, season]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
        <Loader size={80} />
      </View>
    );
  }

  if (error || !userId) {
    return <ErrorView message={error ?? 'Jugador no encontrado'} onRetry={loadData} />;
  }

  const player = users.find((u) => u.id === userId);
  const member = members.find((m) => m.userId === userId);

  if (!player || !member) {
    return <ErrorView message="Jugador no encontrado" onRetry={loadData} />;
  }

  return (
    <LedgerPlayerDetail
      player={player}
      member={member}
      sessions={sessions}
      sessionDetails={sessionDetails}
      users={users}
    />
  );
}
