import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import type { EndingSubmission, Season, SeasonMember, Session, SessionInjection, SessionParticipant, User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import { ClosingPlayerView } from './closing-player-view';
import { SubmissionReview } from './submission-review';
import { ClosingRoster } from './closing-roster';

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

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canManage = isTreasurer || isAdmin;

  const host = users.find((u) => u.id === session.hostUserId);

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([appState.refreshParticipants(), appState.refreshEndingSubmissions()]);
    } finally {
      setRefreshing(false);
    }
  }, [appState]);

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="pb-8"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Banner */}
      <View className="bg-amber-600 px-6 pb-5 pt-16 dark:bg-amber-800">
        <Text className="text-xl font-bold text-white">Session Closing</Text>
        {host && (
          <Text className="mt-1 text-sm text-amber-100">
            Host: {host.displayName}
            {session.location ? ` \u2022 ${session.location}` : ''}
          </Text>
        )}
        <View className="mt-2 self-start rounded-full bg-white/20 px-3 py-1">
          <Text className="text-xs font-semibold text-white">
            {validatedCount} of {participants.length} validated
          </Text>
        </View>
      </View>

      <View className="mt-4">
        {/* Player view — personal stats + submission form/status */}
        <ClosingPlayerView
          participant={myParticipant}
          participants={participants}
          injections={injections}
          endingSubmissions={endingSubmissions}
          users={users}
        />

        {/* Treasurer: Pending submission reviews */}
        {canManage && (
          <SubmissionReview
            endingSubmissions={endingSubmissions}
            participants={participants}
            injections={injections}
            users={users}
          />
        )}

        {/* Closing roster table */}
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
