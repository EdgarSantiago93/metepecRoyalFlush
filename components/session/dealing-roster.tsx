import { useCallback, useRef, useState } from 'react';
import { Alert, Animated, Pressable, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import type { SessionParticipant, User } from '@/types';
import { useAppState } from '@/hooks/use-app-state';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

type Props = {
  participants: SessionParticipant[];
  users: User[];
};

export function DealingRoster({ participants, users }: Props) {
  const checkedIn = participants.filter((p) => p.checkedInAt !== null);
  const confirmed = checkedIn.filter((p) => p.confirmedStartAt !== null);

  return (
    <View className="mx-6 mb-4">
      <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
        Roster
      </Text>

      {/* Header */}
      <View className="flex-row rounded-t-lg border border-b-0 border-sand-200 bg-sand-200/50 px-3 py-2 dark:border-sand-700 dark:bg-sand-800">
        <Text className="flex-1 text-xs font-semibold text-sand-600 dark:text-sand-400">
          Name
        </Text>
        <Text className="w-20 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
          Stack
        </Text>
        <Text className="w-24 text-right text-xs font-semibold text-sand-600 dark:text-sand-400">
          Status
        </Text>
      </View>

      {/* Rows */}
      {participants.map((p, i) => (
        <RosterRow
          key={p.id}
          participant={p}
          users={users}
          isLast={i === participants.length - 1}
        />
      ))}

      {participants.length === 0 && (
        <View className="rounded-b-lg border border-sand-200 px-3 py-6 dark:border-sand-700">
          <Text className="text-center text-sm text-sand-400 dark:text-sand-500">
            No participants yet
          </Text>
        </View>
      )}

      {/* Summary footer */}
      <Text className="mt-2 text-center text-xs text-sand-500 dark:text-sand-400">
        {checkedIn.length} checked in, {confirmed.length} confirmed of {participants.length}{' '}
        {participants.length === 1 ? 'member' : 'members'}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row with swipe-to-remove
// ---------------------------------------------------------------------------

function RosterRow({
  participant,
  users,
  isLast,
}: {
  participant: SessionParticipant;
  users: User[];
  isLast: boolean;
}) {
  const appState = useAppState();
  const swipeRef = useRef<Swipeable>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removing, setRemoving] = useState(false);

  const user = users.find((u) => u.id === participant.userId);
  const name = user?.displayName ?? participant.guestName ?? 'Unknown';
  const stack = `$${(participant.startingStackCents / 100).toLocaleString()}`;

  const status = getStatus(participant);

  const handleRemove = useCallback(async () => {
    setRemoving(true);
    try {
      await appState.removeParticipant(participant.id);
      setShowRemoveModal(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to remove participant');
    } finally {
      setRemoving(false);
      swipeRef.current?.close();
    }
  }, [appState, participant.id]);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={{ transform: [{ translateX }] }}>
        <Pressable
          className="h-full w-20 items-center justify-center bg-red-600"
          onPress={() => {
            setShowRemoveModal(true);
          }}
        >
          <Text className="text-xs font-semibold text-white">Remove</Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <>
      <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
        <View
          className={`flex-row items-center border border-t-0 border-sand-200 bg-sand-50 px-3 py-3 dark:border-sand-700 dark:bg-sand-800/50 ${
            isLast ? 'rounded-b-lg' : ''
          }`}
        >
          <Text
            className="flex-1 text-sm font-medium text-sand-950 dark:text-sand-50"
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text className="w-20 text-center text-sm text-sand-600 dark:text-sand-300">
            {stack}
          </Text>
          <View className="w-24 items-end">
            <StatusBadge status={status} />
          </View>
        </View>
      </Swipeable>

      <ConfirmationModal
        visible={showRemoveModal}
        title="Remove Participant"
        message={`Remove ${name} from this session? They will need to check in again.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleRemove}
        onCancel={() => {
          setShowRemoveModal(false);
          swipeRef.current?.close();
        }}
        loading={removing}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ParticipantStatus = 'not_here' | 'checked_in' | 'confirmed' | 'disputed';

function getStatus(p: SessionParticipant): ParticipantStatus {
  if (!p.checkedInAt) return 'not_here';
  if (p.startDisputeNote) return 'disputed';
  if (p.confirmedStartAt) return 'confirmed';
  return 'checked_in';
}

const STATUS_STYLES: Record<ParticipantStatus, { bg: string; text: string; label: string }> = {
  not_here: {
    bg: 'bg-sand-200 dark:bg-sand-700',
    text: 'text-sand-600 dark:text-sand-400',
    label: 'Not here',
  },
  checked_in: {
    bg: 'bg-gold-100 dark:bg-gold-900/40',
    text: 'text-gold-700 dark:text-gold-300',
    label: 'Checked in',
  },
  confirmed: {
    bg: 'bg-felt-100 dark:bg-felt-900/40',
    text: 'text-felt-700 dark:text-felt-300',
    label: 'Confirmed',
  },
  disputed: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-700 dark:text-red-300',
    label: 'Disputed',
  },
};

function StatusBadge({ status }: { status: ParticipantStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <View className={`rounded-full px-2 py-0.5 ${style.bg}`}>
      <Text className={`text-[10px] font-semibold ${style.text}`}>{style.label}</Text>
    </View>
  );
}
