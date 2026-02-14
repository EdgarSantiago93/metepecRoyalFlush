import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { SessionParticipant } from '@/types';
import { useAppState } from '@/hooks/use-app-state';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

type Props = {
  participant: SessionParticipant | null;
};

export function DealingPlayerView({ participant }: Props) {
  if (!participant) {
    return <NotCheckedIn />;
  }
  if (participant.startDisputeNote) {
    return <Disputed participant={participant} />;
  }
  if (participant.confirmedStartAt) {
    return <Confirmed participant={participant} />;
  }
  return <AwaitingConfirmation participant={participant} />;
}

// ---------------------------------------------------------------------------
// State 1: Not checked in
// ---------------------------------------------------------------------------

function NotCheckedIn() {
  const appState = useAppState();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await appState.checkIn();
      setShowModal(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to check in');
    } finally {
      setLoading(false);
    }
  }, [appState]);

  return (
    <View className="mx-6 mb-4 rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
      <Text className="mb-1 text-base font-semibold text-sand-950 dark:text-sand-50">
        You haven&apos;t checked in yet
      </Text>
      <Text className="mb-4 text-sm text-sand-500 dark:text-sand-400">
        Check in to receive your starting stack from the treasurer.
      </Text>
      <Pressable
        className="items-center rounded-lg bg-gold-500 py-3 active:bg-gold-600"
        onPress={() => setShowModal(true)}
      >
        <Text className="text-base font-semibold text-white">Check In</Text>
      </Pressable>

      <ConfirmationModal
        visible={showModal}
        title="Check In to Session"
        message="If you check in but do not attend, the big and small blind rule will apply."
        confirmLabel="Check In"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setShowModal(false)}
        loading={loading}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// State 2: Checked in, awaiting confirmation
// ---------------------------------------------------------------------------

function AwaitingConfirmation({ participant }: { participant: SessionParticipant }) {
  const appState = useAppState();
  const [confirming, setConfirming] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeNote, setDisputeNote] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const formattedStack = `$${(participant.startingStackCents / 100).toLocaleString()} MXN`;

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    try {
      await appState.confirmStart(participant.id);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to confirm');
    } finally {
      setConfirming(false);
    }
  }, [appState, participant.id]);

  const handleDispute = useCallback(async () => {
    if (!disputeNote.trim()) {
      Alert.alert('Required', 'Please describe the issue');
      return;
    }
    setSubmittingDispute(true);
    try {
      await appState.disputeStart(participant.id, disputeNote.trim());
      setShowDispute(false);
      setDisputeNote('');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit dispute');
    } finally {
      setSubmittingDispute(false);
    }
  }, [appState, participant.id, disputeNote]);

  return (
    <View className="mx-6 mb-4 rounded-xl border border-gold-300 bg-gold-50 p-4 dark:border-gold-700 dark:bg-gold-900/30">
      <Text className="mb-1 text-base font-semibold text-sand-950 dark:text-sand-50">
        Confirm Your Starting Stack
      </Text>
      <Text className="mb-4 text-sm text-sand-600 dark:text-sand-300">
        You should receive <Text className="font-bold">{formattedStack}</Text> from the treasurer.
      </Text>

      {!showDispute ? (
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 items-center rounded-lg border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
            onPress={() => setShowDispute(true)}
            disabled={confirming}
          >
            <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
              Dispute
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-lg py-3 ${confirming ? 'bg-gold-300 dark:bg-gold-700' : 'bg-gold-500 active:bg-gold-600'}`}
            onPress={handleConfirm}
            disabled={confirming}
          >
            <Text className="text-sm font-semibold text-white">
              {confirming ? 'Confirming...' : 'Confirm Received'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-3">
          <TextInput
            className="rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm text-sand-950 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-50"
            placeholder="Describe the issue (e.g. wrong amount)"
            placeholderTextColor="#94a3b8"
            value={disputeNote}
            onChangeText={setDisputeNote}
            multiline
            autoFocus
          />
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 items-center rounded-lg border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
              onPress={() => {
                setShowDispute(false);
                setDisputeNote('');
              }}
              disabled={submittingDispute}
            >
              <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 items-center rounded-lg py-3 ${submittingDispute ? 'bg-red-400 dark:bg-red-800' : 'bg-red-600 active:bg-red-700'}`}
              onPress={handleDispute}
              disabled={submittingDispute}
            >
              <Text className="text-sm font-semibold text-white">
                {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// State 3: Confirmed
// ---------------------------------------------------------------------------

function Confirmed({ participant }: { participant: SessionParticipant }) {
  const formattedStack = `$${(participant.startingStackCents / 100).toLocaleString()} MXN`;

  return (
    <View className="mx-6 mb-4 rounded-xl border border-felt-300 bg-felt-50 p-4 dark:border-felt-700 dark:bg-felt-900/30">
      <Text className="mb-1 text-base font-semibold text-felt-800 dark:text-felt-200">
        You&apos;re checked in
      </Text>
      <Text className="text-sm text-felt-700 dark:text-felt-300">
        Starting stack: <Text className="font-bold">{formattedStack}</Text>
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// State 4: Disputed
// ---------------------------------------------------------------------------

function Disputed({ participant }: { participant: SessionParticipant }) {
  return (
    <View className="mx-6 mb-4 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/30">
      <Text className="mb-1 text-base font-semibold text-red-800 dark:text-red-200">
        Dispute Submitted
      </Text>
      <Text className="mb-2 text-sm text-red-700 dark:text-red-300">
        &ldquo;{participant.startDisputeNote}&rdquo;
      </Text>
      <Text className="text-xs text-red-500 dark:text-red-400">
        Waiting for the treasurer to resolve this dispute.
      </Text>
    </View>
  );
}
