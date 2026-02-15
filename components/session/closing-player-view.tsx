import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { EndingSubmission, SessionInjection, SessionParticipant, User } from '@/types';
import { useAppState } from '@/hooks/use-app-state';

type Props = {
  participant: SessionParticipant | null;
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

export function ClosingPlayerView({
  participant,
  participants,
  injections,
  endingSubmissions,
  users,
}: Props) {
  if (!participant) {
    return (
      <View className="mx-6 mb-4 rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
        <Text className="text-sm text-sand-500 dark:text-sand-400">
          You are not a participant in this session.
        </Text>
      </View>
    );
  }

  const myInjections = injections.filter(
    (inj) => inj.participantId === participant.id && inj.status === 'approved',
  );
  const approvedRebuysTotal = myInjections.reduce((sum, inj) => sum + inj.amountCents, 0);
  const totalIn = participant.startingStackCents + approvedRebuysTotal;

  const latestSubmission = getLatestSubmission(participant.id, endingSubmissions);

  return (
    <View className="mx-6 mb-4">
      {/* Stats card */}
      <View className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/30">
        <Text className="mb-2 text-base font-semibold text-amber-800 dark:text-amber-200">
          Your Session
        </Text>
        <View className="flex-row justify-between">
          <StatItem label="Starting" value={`$${(participant.startingStackCents / 100).toLocaleString()} MXN`} />
          <StatItem label="Rebuys" value={`$${(approvedRebuysTotal / 100).toLocaleString()} MXN`} />
          <StatItem label="Total In" value={`$${(totalIn / 100).toLocaleString()} MXN`} />
        </View>
      </View>

      {/* State-dependent UI */}
      {!latestSubmission || latestSubmission.status === 'rejected' ? (
        <SubmissionForm
          participant={participant}
          participants={participants}
          endingSubmissions={endingSubmissions}
          users={users}
          rejectedSubmission={latestSubmission?.status === 'rejected' ? latestSubmission : null}
        />
      ) : latestSubmission.status === 'pending' ? (
        <PendingBadge submission={latestSubmission} />
      ) : (
        <ValidatedBadge submission={latestSubmission} />
      )}
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center">
      <Text className="text-xs text-sand-500 dark:text-sand-400">{label}</Text>
      <Text className="text-sm font-bold text-sand-950 dark:text-sand-50">{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pending badge
// ---------------------------------------------------------------------------

function PendingBadge({ submission }: { submission: EndingSubmission }) {
  return (
    <View className="rounded-xl border border-gold-300 bg-gold-50 p-4 dark:border-gold-700 dark:bg-gold-900/30">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-sand-950 dark:text-sand-50">
          Submitted: ${(submission.endingStackCents / 100).toLocaleString()} MXN
        </Text>
        <View className="rounded-full bg-gold-100 px-3 py-1 dark:bg-gold-900/40">
          <Text className="text-xs font-semibold text-gold-700 dark:text-gold-300">
            Pending validation
          </Text>
        </View>
      </View>
      {submission.note && (
        <Text className="text-sm text-sand-500 dark:text-sand-400">
          Note: {submission.note}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Validated badge
// ---------------------------------------------------------------------------

function ValidatedBadge({ submission }: { submission: EndingSubmission }) {
  return (
    <View className="rounded-xl border border-felt-300 bg-felt-50 p-4 dark:border-felt-700 dark:bg-felt-900/30">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-sand-950 dark:text-sand-50">
          Ending: ${(submission.endingStackCents / 100).toLocaleString()} MXN
        </Text>
        <View className="rounded-full bg-felt-100 px-3 py-1 dark:bg-felt-900/40">
          <Text className="text-xs font-semibold text-felt-700 dark:text-felt-300">
            Validated
          </Text>
        </View>
      </View>
      {submission.note && (
        <Text className="text-sm text-sand-500 dark:text-sand-400">
          Note: {submission.note}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Submission form (new submission or resubmit after rejection)
// ---------------------------------------------------------------------------

function SubmissionForm({
  participant,
  participants,
  endingSubmissions,
  users,
  rejectedSubmission,
}: {
  participant: SessionParticipant;
  participants: SessionParticipant[];
  endingSubmissions: EndingSubmission[];
  users: User[];
  rejectedSubmission: EndingSubmission | null;
}) {
  const appState = useAppState();
  const [endingStack, setEndingStack] = useState(
    rejectedSubmission ? String(rejectedSubmission.endingStackCents / 100) : '',
  );
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState(rejectedSubmission?.note ?? '');
  const [loading, setLoading] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState(participant.id);

  // Participants who lack a pending/validated submission (eligible for "submit for someone else")
  const eligibleOthers = useMemo(() => {
    return participants.filter((p) => {
      if (p.id === participant.id) return false;
      const latest = getLatestSubmission(p.id, endingSubmissions);
      return !latest || latest.status === 'rejected';
    });
  }, [participants, participant.id, endingSubmissions]);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
      return;
    }

    const libStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (libStatus.status !== 'granted') {
      Alert.alert('Permission needed', 'Camera or photo library access is required for proof photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const cents = Math.round(Number(endingStack) * 100);
    if (isNaN(cents) || cents < 0) {
      Alert.alert('Invalid', 'Please enter a valid ending stack amount');
      return;
    }
    if (!photoUri) {
      Alert.alert('Required', 'Please attach a proof photo of your chip count');
      return;
    }
    setLoading(true);
    try {
      await appState.submitEndingStack(
        selectedParticipantId,
        cents,
        photoUri,
        note.trim() || undefined,
      );
      setEndingStack('');
      setPhotoUri(null);
      setNote('');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit ending stack');
    } finally {
      setLoading(false);
    }
  }, [appState, endingStack, photoUri, note, selectedParticipantId]);

  const canSubmit = endingStack.trim() !== '' && !isNaN(Number(endingStack)) && Number(endingStack) >= 0 && photoUri !== null;

  return (
    <View className="rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
      {rejectedSubmission && (
        <View className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/30">
          <View className="mb-1 flex-row items-center gap-2">
            <View className="rounded-full bg-red-100 px-2 py-0.5 dark:bg-red-900/40">
              <Text className="text-[10px] font-semibold text-red-700 dark:text-red-300">
                Rejected
              </Text>
            </View>
          </View>
          {rejectedSubmission.reviewNote && (
            <Text className="text-sm text-red-600 dark:text-red-400">
              {rejectedSubmission.reviewNote}
            </Text>
          )}
        </View>
      )}

      <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
        {rejectedSubmission ? 'Resubmit Ending Stack' : 'Submit Ending Stack'}
      </Text>

      {/* Ending stack input */}
      <View className="mb-3">
        <Text className="mb-1 text-xs text-sand-500 dark:text-sand-400">
          Ending Stack (MXN)
        </Text>
        <TextInput
          className="rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm text-sand-950 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-50"
          placeholder="e.g. 850"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={endingStack}
          onChangeText={setEndingStack}
        />
      </View>

      {/* Photo picker */}
      <View className="mb-3">
        <Text className="mb-1 text-xs text-sand-500 dark:text-sand-400">
          Proof Photo (required)
        </Text>
        {photoUri ? (
          <View className="flex-row items-end gap-3">
            <Image
              source={{ uri: photoUri }}
              className="h-24 w-24 rounded-lg"
              resizeMode="cover"
            />
            <Pressable onPress={() => setPhotoUri(null)}>
              <Text className="text-xs text-red-500">Remove</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            className="items-center rounded-lg border border-dashed border-sand-300 py-3 active:bg-sand-200 dark:border-sand-600 dark:active:bg-sand-700"
            onPress={handlePickImage}
          >
            <Text className="text-sm text-sand-500 dark:text-sand-400">
              Take or pick a photo
            </Text>
          </Pressable>
        )}
      </View>

      {/* Optional note */}
      <View className="mb-3">
        <Text className="mb-1 text-xs text-sand-500 dark:text-sand-400">
          Note (optional)
        </Text>
        <TextInput
          className="rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm text-sand-950 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-50"
          placeholder="Any comments about the count"
          placeholderTextColor="#94a3b8"
          value={note}
          onChangeText={setNote}
        />
      </View>

      {/* Submit for someone else */}
      {eligibleOthers.length > 0 && (
        <View className="mb-3">
          <Text className="mb-1 text-xs text-sand-500 dark:text-sand-400">
            Submitting for
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              className={`rounded-lg border px-3 py-1.5 ${
                selectedParticipantId === participant.id
                  ? 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-900/30'
                  : 'border-sand-300 bg-white dark:border-sand-600 dark:bg-sand-800'
              }`}
              onPress={() => setSelectedParticipantId(participant.id)}
            >
              <Text className={`text-xs font-medium ${
                selectedParticipantId === participant.id
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-sand-700 dark:text-sand-300'
              }`}>
                Myself
              </Text>
            </Pressable>
            {eligibleOthers.map((p) => {
              const user = users.find((u) => u.id === p.userId);
              const name = user?.displayName ?? p.guestName ?? 'Unknown';
              const isSelected = selectedParticipantId === p.id;
              return (
                <Pressable
                  key={p.id}
                  className={`rounded-lg border px-3 py-1.5 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-900/30'
                      : 'border-sand-300 bg-white dark:border-sand-600 dark:bg-sand-800'
                  }`}
                  onPress={() => setSelectedParticipantId(p.id)}
                >
                  <Text className={`text-xs font-medium ${
                    isSelected
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-sand-700 dark:text-sand-300'
                  }`}>
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Submit button */}
      <Pressable
        className={`items-center rounded-lg py-3.5 ${
          canSubmit && !loading
            ? 'bg-amber-500 active:bg-amber-600'
            : 'bg-sand-300 dark:bg-sand-700'
        }`}
        onPress={handleSubmit}
        disabled={!canSubmit || loading}
      >
        <Text className="text-base font-semibold text-white">
          {loading ? 'Submitting...' : rejectedSubmission ? 'Resubmit' : 'Submit'}
        </Text>
      </Pressable>
    </View>
  );
}
