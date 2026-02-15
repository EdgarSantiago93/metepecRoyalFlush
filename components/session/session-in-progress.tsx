import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import type { Season, SeasonMember, Session, SessionInjection, SessionParticipant, User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import { InProgressPlayerView } from './in-progress-player-view';
import { InProgressRoster } from './in-progress-roster';
import { RebuyApprovals } from './rebuy-approvals';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

type Props = {
  session: Session;
  season: Season;
  members: SeasonMember[];
  participants: SessionParticipant[];
  injections: SessionInjection[];
  users: User[];
};

export function SessionInProgress({ session, season, members, participants, injections, users }: Props) {
  const auth = useAuth();
  const appState = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [ending, setEnding] = useState(false);

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canManage = isTreasurer || isAdmin;

  const host = users.find((u) => u.id === session.hostUserId);

  // Current user's participant record
  const myParticipant = useMemo(
    () => participants.find((p) => p.userId === currentUser?.id) ?? null,
    [participants, currentUser?.id],
  );

  // Approved injections feed (chronological, only approved)
  const approvedFeed = useMemo(
    () =>
      injections
        .filter((inj) => inj.status === 'approved')
        .sort((a, b) => new Date(b.reviewedAt!).getTime() - new Date(a.reviewedAt!).getTime()),
    [injections],
  );

  const pendingCount = injections.filter((inj) => inj.status === 'pending').length;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([appState.refreshParticipants(), appState.refreshInjections()]);
    } finally {
      setRefreshing(false);
    }
  }, [appState]);

  const handleEndSession = useCallback(async () => {
    setEnding(true);
    try {
      await appState.endSession();
      setShowEndModal(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to end session');
    } finally {
      setEnding(false);
    }
  }, [appState]);

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="pb-8"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Banner */}
      <View className="bg-felt-600 px-6 pb-5 pt-16 dark:bg-felt-800">
        <Text className="text-xl font-bold text-white">Session In Progress</Text>
        {host && (
          <Text className="mt-1 text-sm text-felt-100">
            Host: {host.displayName}
            {session.location ? ` \u2022 ${session.location}` : ''}
          </Text>
        )}
        {pendingCount > 0 && canManage && (
          <View className="mt-2 self-start rounded-full bg-gold-500 px-3 py-1">
            <Text className="text-xs font-semibold text-white">
              {pendingCount} pending rebuy{pendingCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <View className="mt-4">
        {/* Player view — personal stats + rebuy request */}
        <InProgressPlayerView participant={myParticipant} injections={injections} />

        {/* Treasurer: Pending rebuy approvals */}
        {canManage && (
          <RebuyApprovals
            injections={injections}
            participants={participants}
            users={users}
          />
        )}

        {/* Participants roster */}
        <InProgressRoster
          participants={participants}
          injections={injections}
          users={users}
        />

        {/* Approved rebuys feed */}
        {approvedFeed.length > 0 && (
          <View className="mx-6 mb-4">
            <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
              Approved Rebuys
            </Text>
            {approvedFeed.map((inj) => {
              const participant = participants.find((p) => p.id === inj.participantId);
              const user = users.find((u) => u.id === participant?.userId);
              const name = user?.displayName ?? participant?.guestName ?? 'Unknown';
              const amount = `$${(inj.amountCents / 100).toLocaleString()} MXN`;
              const time = new Date(inj.reviewedAt!).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <View
                  key={inj.id}
                  className="mb-2 flex-row items-center justify-between rounded-lg border border-sand-200 bg-sand-50 px-3 py-2.5 dark:border-sand-700 dark:bg-sand-800/50"
                >
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">
                      {name}
                    </Text>
                    <Text className="text-xs text-sand-500 dark:text-sand-400">
                      {time}
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-felt-600 dark:text-felt-400">
                    +{amount}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* End Session button (treasurer/admin) */}
        {canManage && (
          <View className="mx-6 mt-2">
            <Pressable
              className="items-center rounded-lg border border-red-300 py-3.5 active:bg-red-50 dark:border-red-700 dark:active:bg-red-900/30"
              onPress={() => setShowEndModal(true)}
            >
              <Text className="text-base font-semibold text-red-600 dark:text-red-400">
                End Session
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <ConfirmationModal
        visible={showEndModal}
        title="End Session"
        message="End this session and move to the closing phase? No more rebuys will be allowed after this point."
        confirmLabel="End Session"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleEndSession}
        onCancel={() => setShowEndModal(false)}
        loading={ending}
      />
    </ScrollView>
  );
}
