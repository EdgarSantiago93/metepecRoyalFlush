import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import type { SessionInjection, SessionParticipant, User } from '@/types';
import { useAppState } from '@/hooks/use-app-state';

type Props = {
  injections: SessionInjection[];
  participants: SessionParticipant[];
  users: User[];
};

export function RebuyApprovals({ injections, participants, users }: Props) {
  const pending = injections.filter((inj) => inj.status === 'pending');

  if (pending.length === 0) {
    return (
      <View className="mx-6 mb-4">
        <Text className="mb-2 text-base font-semibold text-sand-950 dark:text-sand-50">
          Rebuy Requests
        </Text>
        <View className="rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
          <Text className="text-center text-sm text-sand-400 dark:text-sand-500">
            No pending rebuy requests
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mx-6 mb-4">
      <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
        Rebuy Requests ({pending.length} pending)
      </Text>

      {pending.map((inj) => (
        <PendingInjectionCard
          key={inj.id}
          injection={inj}
          participants={participants}
          users={users}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Per-injection approval card
// ---------------------------------------------------------------------------

function PendingInjectionCard({
  injection,
  participants,
  users,
}: {
  injection: SessionInjection;
  participants: SessionParticipant[];
  users: User[];
}) {
  const appState = useAppState();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const participant = participants.find((p) => p.id === injection.participantId);
  const user = users.find((u) => u.id === participant?.userId);
  const playerName = user?.displayName ?? participant?.guestName ?? 'Unknown';
  const amount = `$${(injection.amountCents / 100).toLocaleString()} MXN`;
  const typeLabel = injection.type === 'rebuy_500' ? 'Full Rebuy' : injection.type === 'half_250' ? 'Half Rebuy' : 'Buy-in';

  const handleApprove = useCallback(async () => {
    setApproving(true);
    try {
      await appState.reviewInjection(injection.id, 'approve');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setApproving(false);
    }
  }, [appState, injection.id]);

  const handleReject = useCallback(async () => {
    if (!rejectNote.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }
    setRejecting(true);
    try {
      await appState.reviewInjection(injection.id, 'reject', rejectNote.trim());
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  }, [appState, injection.id, rejectNote]);

  const busy = approving || rejecting;

  return (
    <View className="mb-3 rounded-xl border border-gold-300 bg-gold-50 p-4 dark:border-gold-700 dark:bg-gold-900/30">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-sand-950 dark:text-sand-50">
          {playerName}
        </Text>
        <View className="rounded-full bg-gold-100 px-2 py-0.5 dark:bg-gold-900/40">
          <Text className="text-[10px] font-semibold text-gold-700 dark:text-gold-300">
            {typeLabel}
          </Text>
        </View>
      </View>

      <Text className="mb-1 text-lg font-bold text-sand-950 dark:text-sand-50">
        {amount}
      </Text>

      <Text className="mb-3 text-xs text-sand-500 dark:text-sand-400">
        Requested {new Date(injection.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>

      {injection.proofPhotoUrl && (
        <Image
          source={{ uri: injection.proofPhotoUrl }}
          className="mb-3 h-20 w-20 rounded-lg"
          resizeMode="cover"
        />
      )}

      {!showRejectInput ? (
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 items-center rounded-lg border border-sand-300 py-2.5 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
            onPress={() => setShowRejectInput(true)}
            disabled={busy}
          >
            <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
              Reject
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-lg py-2.5 ${
              busy ? 'bg-felt-400 dark:bg-felt-800' : 'bg-felt-600 active:bg-felt-700'
            }`}
            onPress={handleApprove}
            disabled={busy}
          >
            <Text className="text-sm font-semibold text-white">
              {approving ? 'Approving...' : 'Approve'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-3">
          <TextInput
            className="rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm text-sand-950 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-50"
            placeholder="Reason for rejection (required)"
            placeholderTextColor="#94a3b8"
            value={rejectNote}
            onChangeText={setRejectNote}
            autoFocus
          />
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 items-center rounded-lg border border-sand-300 py-2.5 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
              onPress={() => {
                setShowRejectInput(false);
                setRejectNote('');
              }}
              disabled={rejecting}
            >
              <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 items-center rounded-lg py-2.5 ${
                rejecting ? 'bg-red-400 dark:bg-red-800' : 'bg-red-600 active:bg-red-700'
              }`}
              onPress={handleReject}
              disabled={rejecting}
            >
              <Text className="text-sm font-semibold text-white">
                {rejecting ? 'Rejecting...' : 'Reject'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
