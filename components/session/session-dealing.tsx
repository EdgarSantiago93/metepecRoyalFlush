import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import type { Season, SeasonMember, Session, SessionParticipant, User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import { DealingPlayerView } from './dealing-player-view';
import { DealingRoster } from './dealing-roster';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

type Props = {
  session: Session;
  season: Season;
  members: SeasonMember[];
  participants: SessionParticipant[];
  users: User[];
};

export function SessionDealing({ session, season, members, participants, users }: Props) {
  const auth = useAuth();
  const appState = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [starting, setStarting] = useState(false);

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canManage = isTreasurer || isAdmin;

  const host = users.find((u) => u.id === session.hostUserId);

  // Current user's participant record (null if not checked in)
  const myParticipant = useMemo(
    () => participants.find((p) => p.userId === currentUser?.id) ?? null,
    [participants, currentUser?.id],
  );

  // Readiness checks for "Start Session" button
  const checkedIn = participants.filter((p) => p.checkedInAt !== null);
  const confirmed = checkedIn.filter((p) => p.confirmedStartAt !== null);
  const unconfirmed = checkedIn.filter(
    (p) => p.confirmedStartAt === null && p.startDisputeNote === null,
  );
  const disputed = checkedIn.filter((p) => p.startDisputeNote !== null);

  const canStart = checkedIn.length >= 2 && unconfirmed.length === 0 && disputed.length === 0;

  const disabledReason = useMemo(() => {
    if (checkedIn.length < 2) {
      return `Need at least 2 checked-in players (${checkedIn.length} now)`;
    }
    if (disputed.length > 0) {
      return `${disputed.length} dispute${disputed.length > 1 ? 's' : ''} need${disputed.length === 1 ? 's' : ''} to be resolved`;
    }
    if (unconfirmed.length > 0) {
      return `Waiting for ${unconfirmed.length} more confirmation${unconfirmed.length > 1 ? 's' : ''}`;
    }
    return null;
  }, [checkedIn.length, disputed.length, unconfirmed.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await appState.refreshParticipants();
    } finally {
      setRefreshing(false);
    }
  }, [appState]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      await appState.moveToInProgress();
      setShowStartModal(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to start session');
    } finally {
      setStarting(false);
    }
  }, [appState]);

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="pb-8"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Banner */}
      <View className="bg-gold-500 px-6 pb-5 pt-16 dark:bg-gold-700">
        <Text className="text-xl font-bold text-white">Dealing in Progress</Text>
        {host && (
          <Text className="mt-1 text-sm text-gold-100">
            Host: {host.displayName}
            {session.location ? ` \u2022 ${session.location}` : ''}
          </Text>
        )}
      </View>

      <View className="mt-4">
        {/* Player view — personal check-in / confirm / dispute */}
        <DealingPlayerView participant={myParticipant} />

        {/* Treasurer/Admin roster */}
        {canManage && <DealingRoster participants={participants} users={users} />}

        {/* Start Session button (treasurer/admin) */}
        {canManage && (
          <View className="mx-6 mt-2">
            <Pressable
              className={`items-center rounded-lg py-3.5 ${
                canStart
                  ? 'bg-felt-600 active:bg-felt-700'
                  : 'bg-sand-300 dark:bg-sand-700'
              }`}
              onPress={() => setShowStartModal(true)}
              disabled={!canStart}
            >
              <Text
                className={`text-base font-semibold ${
                  canStart ? 'text-white' : 'text-sand-500 dark:text-sand-400'
                }`}
              >
                Move to In Progress
              </Text>
            </Pressable>

            {disabledReason && (
              <Text className="mt-2 text-center text-xs text-sand-500 dark:text-sand-400">
                {disabledReason}
              </Text>
            )}
          </View>
        )}

        {!canManage && (
          <Text className="mx-6 mt-2 text-center text-sm text-sand-500 dark:text-sand-400">
            Waiting for the treasurer to start the session.
          </Text>
        )}
      </View>

      <ConfirmationModal
        visible={showStartModal}
        title="Start Session"
        message={`Move this session to in progress? ${confirmed.length} player${confirmed.length !== 1 ? 's' : ''} confirmed and ready to play.`}
        confirmLabel="Start"
        cancelLabel="Cancel"
        onConfirm={handleStart}
        onCancel={() => setShowStartModal(false)}
        loading={starting}
      />
    </ScrollView>
  );
}
