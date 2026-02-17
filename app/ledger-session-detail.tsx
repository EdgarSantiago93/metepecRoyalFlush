import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Loader } from '@/components/ui/loader';
import { ErrorView } from '@/components/ui/error-view';
import { LedgerSessionDetail } from '@/components/ledger/ledger-session-detail';
import { api } from '@/services/api/client';
import { useAppState } from '@/hooks/use-app-state';
import type { EndingSubmission, Session, SessionFinalizeNote, SessionInjection, SessionParticipant } from '@/types';

export default function LedgerSessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const appState = useAppState();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [injections, setInjections] = useState<SessionInjection[]>([]);
  const [endingSubmissions, setEndingSubmissions] = useState<EndingSubmission[]>([]);
  const [finalizeNote, setFinalizeNote] = useState<SessionFinalizeNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await api.getSessionDetail(sessionId);
      setSession(detail.session);
      setParticipants(detail.participants);
      setInjections(detail.injections);
      setEndingSubmissions(detail.endingSubmissions);
      setFinalizeNote(detail.finalizeNote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el juego');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
        <Loader size={80} />
      </View>
    );
  }

  if (error || !session) {
    return <ErrorView message={error ?? 'Juego no encontrado'} onRetry={loadDetail} />;
  }

  const users = appState.status !== 'loading' && appState.status !== 'error' ? (
    'users' in appState ? appState.users : []
  ) : [];

  return (
    <LedgerSessionDetail
      session={session}
      participants={participants}
      injections={injections}
      endingSubmissions={endingSubmissions}
      finalizeNote={finalizeNote}
      users={users}
    />
  );
}
