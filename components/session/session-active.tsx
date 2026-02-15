import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import type { EndingSubmission, Season, SeasonMember, Session, SessionInjection, SessionParticipant, User } from '@/types';
import { SessionDealing } from './session-dealing';
import { SessionInProgress } from './session-in-progress';
import { SessionClosing } from './session-closing';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

type Props = {
  session: Session;
  season: Season;
  members: SeasonMember[];
  participants: SessionParticipant[];
  injections: SessionInjection[];
  endingSubmissions: EndingSubmission[];
  users: User[];
};

export function SessionActive({ session, season, members, participants, injections, endingSubmissions, users }: Props) {
  if (session.state === 'scheduled') {
    return <SessionScheduled session={session} season={season} members={members} users={users} />;
  }

  if (session.state === 'dealing') {
    return (
      <SessionDealing
        session={session}
        season={season}
        members={members}
        participants={participants}
        users={users}
      />
    );
  }

  if (session.state === 'in_progress') {
    return (
      <SessionInProgress
        session={session}
        season={season}
        members={members}
        participants={participants}
        injections={injections}
        users={users}
      />
    );
  }

  if (session.state === 'closing') {
    return (
      <SessionClosing
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

  // finalized — placeholder for future phases
  return <SessionFinalizedPlaceholder session={session} users={users} />;
}

// ---------------------------------------------------------------------------
// Scheduled sub-component
// ---------------------------------------------------------------------------

function SessionScheduled({ session, season, users }: Omit<Props, 'participants' | 'injections' | 'endingSubmissions'>) {
  const router = useRouter();
  const auth = useAuth();
  const appState = useAppState();
  const [starting, setStarting] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canManage = isTreasurer || isAdmin;

  const host = users.find((u) => u.id === session.hostUserId);
  const scheduledBy = users.find((u) => u.id === session.scheduledByUserId);

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      await appState.startSession();
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
      contentContainerClassName="px-6 pt-16 pb-8"
    >
      <Text className="mb-1 text-2xl font-bold text-sand-950 dark:text-sand-50">
        Session Scheduled
      </Text>

      <View className="mt-1 mb-6 self-start rounded-full bg-gold-100 px-3 py-1 dark:bg-gold-900/40">
        <Text className="text-xs font-semibold text-gold-700 dark:text-gold-300">
          Scheduled
        </Text>
      </View>

      {/* Session details card */}
      <View className="mb-6 rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
        <InfoRow label="Host" value={host?.displayName ?? 'Unknown'} />
        {session.scheduledFor && <InfoRow label="When" value={session.scheduledFor} />}
        {session.location && <InfoRow label="Location" value={session.location} />}
        {scheduledBy && <InfoRow label="Scheduled by" value={scheduledBy.displayName} />}
      </View>

      {/* Action buttons for Treasurer/Admin */}
      {canManage && (
        <View className="gap-3">
          <Pressable
            className={`items-center rounded-lg py-3.5 ${
              !starting ? 'bg-gold-500 active:bg-gold-600' : 'bg-sand-300 dark:bg-sand-700'
            }`}
            onPress={() => setShowStartModal(true)}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">Start Session</Text>
            )}
          </Pressable>
          <Pressable
            className="items-center rounded-lg border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
            onPress={() => router.push('/schedule-session?edit=1' as never)}
            disabled={starting}
          >
            <Text className="text-base font-semibold text-sand-700 dark:text-sand-300">
              Edit Schedule
            </Text>
          </Pressable>
        </View>
      )}

      {!canManage && (
        <Text className="text-center text-sm text-sand-500 dark:text-sand-400">
          Waiting for the treasurer to start the session.
        </Text>
      )}

      <ConfirmationModal
        visible={showStartModal}
        title="Start Session"
        message="Start the dealing phase? Players will be able to check in and receive their starting stacks."
        confirmLabel="Start Session"
        cancelLabel="Cancel"
        onConfirm={handleStart}
        onCancel={() => setShowStartModal(false)}
        loading={starting}
      />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Placeholder for non-scheduled states (future phases)
// ---------------------------------------------------------------------------

function SessionFinalizedPlaceholder({ session, users }: { session: Session; users: User[] }) {
  const host = users.find((u) => u.id === session.hostUserId);

  return (
    <View className="flex-1 bg-sand-50 px-6 pt-16 dark:bg-sand-900">
      <Text className="mb-1 text-2xl font-bold text-sand-950 dark:text-sand-50">
        Active Session
      </Text>

      <View className="mt-1 mb-6 self-start rounded-full bg-felt-100 px-3 py-1 dark:bg-felt-900">
        <Text className="text-xs font-semibold text-felt-700 dark:text-felt-300">
          {session.state.replace('_', ' ')}
        </Text>
      </View>

      <View className="rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
        <InfoRow label="Host" value={host?.displayName ?? 'Unknown'} />
        {session.location && <InfoRow label="Location" value={session.location} />}
        <InfoRow label="State" value={session.state} />
      </View>

      <Text className="mt-6 text-center text-sm text-sand-500 dark:text-sand-400">
        Finalization features coming soon.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row items-center justify-between last:mb-0">
      <Text className="text-sm text-sand-500 dark:text-sand-400">{label}</Text>
      <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">{value}</Text>
    </View>
  );
}
