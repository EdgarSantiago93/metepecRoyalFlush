import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import type { EndingSubmission, SessionInjection, SessionParticipant, User } from '@/types';
import { useAppState } from '@/hooks/use-app-state';

type Props = {
  endingSubmissions: EndingSubmission[];
  participants: SessionParticipant[];
  injections: SessionInjection[];
  users: User[];
};

export function SubmissionReview({ endingSubmissions, participants, injections, users }: Props) {
  const pending = endingSubmissions.filter((s) => s.status === 'pending');

  if (pending.length === 0) {
    return (
      <View className="mx-6 mb-4">
        <Text className="mb-2 text-base font-semibold text-sand-950 dark:text-sand-50">
          Submission Review
        </Text>
        <View className="rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
          <Text className="text-center text-sm text-sand-400 dark:text-sand-500">
            No pending submissions
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mx-6 mb-4">
      <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
        Submission Review ({pending.length} pending)
      </Text>

      {pending.map((sub) => (
        <PendingSubmissionCard
          key={sub.id}
          submission={sub}
          participants={participants}
          injections={injections}
          users={users}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Per-submission review card
// ---------------------------------------------------------------------------

function PendingSubmissionCard({
  submission,
  participants,
  injections,
  users,
}: {
  submission: EndingSubmission;
  participants: SessionParticipant[];
  injections: SessionInjection[];
  users: User[];
}) {
  const appState = useAppState();
  const [validating, setValidating] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const participant = participants.find((p) => p.id === submission.participantId);
  const user = users.find((u) => u.id === participant?.userId);
  const playerName = user?.displayName ?? participant?.guestName ?? 'Unknown';

  // Context: starting stack, approved rebuys, total in
  const approvedRebuys = injections
    .filter((inj) => inj.participantId === submission.participantId && inj.status === 'approved')
    .reduce((sum, inj) => sum + inj.amountCents, 0);
  const startingStack = participant?.startingStackCents ?? 0;
  const totalIn = startingStack + approvedRebuys;

  const handleValidate = useCallback(async () => {
    setValidating(true);
    try {
      await appState.reviewEndingSubmission(submission.id, 'validate');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to validate');
    } finally {
      setValidating(false);
    }
  }, [appState, submission.id]);

  const handleReject = useCallback(async () => {
    if (!rejectNote.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }
    setRejecting(true);
    try {
      await appState.reviewEndingSubmission(submission.id, 'reject', rejectNote.trim());
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  }, [appState, submission.id, rejectNote]);

  const busy = validating || rejecting;

  return (
    <View className="mb-3 rounded-xl border border-gold-300 bg-gold-50 p-4 dark:border-gold-700 dark:bg-gold-900/30">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-sand-950 dark:text-sand-50">
          {playerName}
        </Text>
      </View>

      {/* Context line */}
      <Text className="mb-2 text-xs text-sand-500 dark:text-sand-400">
        Start: ${(startingStack / 100).toLocaleString()} | Rebuys: ${(approvedRebuys / 100).toLocaleString()} | Total in: ${(totalIn / 100).toLocaleString()}
      </Text>

      {/* Submitted ending stack */}
      <Text className="mb-1 text-lg font-bold text-sand-950 dark:text-sand-50">
        Ending: ${(submission.endingStackCents / 100).toLocaleString()} MXN
      </Text>

      {/* Photo thumbnail */}
      <Image
        source={{ uri: submission.photoUrl }}
        className="mb-3 h-20 w-20 rounded-lg"
        resizeMode="cover"
      />

      {/* Submitter note */}
      {submission.note && (
        <Text className="mb-3 text-sm text-sand-600 dark:text-sand-400">
          Note: {submission.note}
        </Text>
      )}

      {/* Actions */}
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
            onPress={handleValidate}
            disabled={busy}
          >
            <Text className="text-sm font-semibold text-white">
              {validating ? 'Validating...' : 'Validate'}
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
