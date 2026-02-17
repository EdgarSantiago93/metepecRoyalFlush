import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import type { EndingSubmission, Season, SeasonMember, Session, SessionInjection, SessionParticipant, User } from '@/types';
import { IconCards, IconChecklist, IconUsers } from '@tabler/icons-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClosingPlayerView } from './closing-player-view';
import { ClosingRoster } from './closing-roster';
import { SessionFinalize } from './session-finalize';
import { SubmissionReview } from './submission-review';

type Props = {
  session: Session;
  season: Season;
  members: SeasonMember[];
  participants: SessionParticipant[];
  injections: SessionInjection[];
  endingSubmissions: EndingSubmission[];
  users: User[];
};

/** Return the latest submission for a given participant, or null. */
function getLatestSubmission(
  participantId: string,
  submissions: EndingSubmission[],
): EndingSubmission | null {
  const forParticipant = submissions
    .filter((s) => s.participantId === participantId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return forParticipant[0] ?? null;
}

export function SessionClosing({
  session,
  season,
  members,
  participants,
  injections,
  endingSubmissions,
  users,
}: Props) {
  const auth = useAuth();
  const appState = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canManage = isTreasurer || isAdmin;

  const host = users.find((u) => u.id === session.hostUserId);

  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779';

  const inset = useSafeAreaInsets();
  const paddingTop = inset.top + 10;

  const myParticipant = useMemo(
    () => participants.find((p) => p.userId === currentUser?.id) ?? null,
    [participants, currentUser?.id],
  );

  const validatedCount = useMemo(() => {
    return participants.filter((p) => {
      const latest = getLatestSubmission(p.id, endingSubmissions);
      return latest?.status === 'validated';
    }).length;
  }, [participants, endingSubmissions]);

  const allValidated = validatedCount === participants.length && participants.length > 0;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([appState.refreshParticipants(), appState.refreshEndingSubmissions()]);
    } finally {
      setRefreshing(false);
    }
  }, [appState]);

  // Show finalize view when treasurer toggles it
  if (showFinalize) {
    return (
      <SessionFinalize
        session={session}
        season={season}
        members={members}
        participants={participants}
        injections={injections}
        endingSubmissions={endingSubmissions}
        users={users}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="pb-12"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      style={{ paddingTop }}
    >
      {/* Header */}
      <View className="px-6 pb-6">
        <Text className="mb-2 text-3xl font-heading text-sand-950 dark:text-sand-50">
          Juego de hoy
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-gold-100 px-3 py-1 dark:bg-gold-900">
            <Text className="text-xs font-semibold text-gold-700 dark:text-gold-300">
              Cerrando
            </Text>
          </View>
          {host && (
            <Text className="text-sm text-sand-500 dark:text-sand-400">
              Host: {host.displayName}
              {session.location ? ` · ${session.location}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Validation Progress Hero — full-bleed gold strip */}
      <View className="bg-gold-50 px-6 py-8 dark:bg-gold-900/30">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-sans-medium text-gold-600 dark:text-gold-400">
           Jugadores validados
          </Text>
          <Text className="text-sm font-sans-semibold text-gold-800 dark:text-gold-200">
            {validatedCount} de {participants.length}
          </Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-gold-200 dark:bg-gold-800">
          <View
            className="h-full rounded-full bg-gold-500"
            style={{ width: `${participants.length > 0 ? (validatedCount / participants.length) * 100 : 0}%` }}
          />
        </View>

        {/* Review & Finalize button — treasurer/admin only, when all validated */}
        {canManage && allValidated && (
          <View className="mt-6">
            <Pressable
              className="items-center rounded-full bg-gold-500 py-3.5 active:bg-gold-600"
              onPress={() => setShowFinalize(true)}
            >
              <Text className="text-base font-semibold text-white">
                Revisar y Finalizar
              </Text>
            </Pressable>
          </View>
        )}

        {canManage && !allValidated && (
          <Text className="mt-3 text-center text-xs text-gold-600 dark:text-gold-400">
            Todos los jugadores deben ser validados para poder cerrar el juego
          </Text>
        )}
      </View>

      {/* Player view — personal stats + submission form/status */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <SectionTitle icon={<IconCards size={18} color={iconColor} />} label="Tu juego" />
        <ClosingPlayerView
          participant={myParticipant}
          participants={participants}
          injections={injections}
          endingSubmissions={endingSubmissions}
          users={users}
        />
      </View>

      {/* Treasurer: Pending submission reviews */}
      {canManage && (
        <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
          <SectionTitle icon={<IconChecklist size={18} color={iconColor} />} label="Revisión de Envíos" />
          <SubmissionReview
            endingSubmissions={endingSubmissions}
            participants={participants}
            injections={injections}
            users={users}
          />
        </View>
      )}

      {/* Closing roster table */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <SectionTitle icon={<IconUsers size={18} color={iconColor} />} label="Roster de Cierre" />
        <ClosingRoster
          participants={participants}
          injections={injections}
          endingSubmissions={endingSubmissions}
          users={users}
        />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="mb-4 flex-row items-center gap-2">
      {icon}
      <Text className="text-base font-sans-bold text-sand-950 dark:text-sand-50">
        {label}
      </Text>
    </View>
  );
}
