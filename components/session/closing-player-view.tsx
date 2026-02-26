import { PhotoThumbnail } from '@/components/ui/photo-viewer';
import type { EndingSubmission, SessionInjection, SessionParticipant, User } from '@/types';
import { IconChevronRight } from '@tabler/icons-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { EndingStackSheet } from './ending-stack-sheet';

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
  const [sheetVisible, setSheetVisible] = useState(false);

  if (!participant) {
    return (
      <View className="rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
        <Text className="text-sm text-sand-500 dark:text-sand-400">
          No eres participante en este juego.
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
  const needsSubmission = !latestSubmission || latestSubmission.status === 'rejected';
  const rejectedSubmission = latestSubmission?.status === 'rejected' ? latestSubmission : null;

  return (
    <View>
      {/* Stats card */}
      <View className="mb-3 rounded-xl border border-gold-300 bg-gold-50 p-4 dark:border-gold-700 dark:bg-gold-900/30">
        <Text className="mb-2 text-base font-semibold text-gold-800 dark:text-gold-200">
          Tu Juego
        </Text>
        <View className="flex-row justify-between">
          <StatItem label="Inicio" value={`$${(participant.startingStackCents / 100).toLocaleString()} MXN`} />
          <StatItem label="Rebuys" value={`$${(approvedRebuysTotal / 100).toLocaleString()} MXN`} />
          <StatItem label="Total Invertido" value={`$${(totalIn / 100).toLocaleString()} MXN`} />
        </View>
      </View>

      {/* State-dependent UI */}
      {needsSubmission ? (
        <>
          {/* Rejection notice */}
          {rejectedSubmission && (
            <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
              <View className="mb-1 flex-row items-center gap-2">
                <View className="rounded-full bg-red-100 px-2.5 py-0.5 dark:bg-red-900/40">
                  <Text className="text-[10px] font-semibold text-red-700 dark:text-red-300">
                    Rechazado
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

          {/* CTA button — opens the bottom sheet */}
          <PulsingCTA
            label={rejectedSubmission ? 'Reenviar Stack Final' : 'Enviar Stack Final'}
            onPress={() => setSheetVisible(true)}
          />

          {/* Bottom sheet */}
          <EndingStackSheet
            visible={sheetVisible}
            onClose={() => setSheetVisible(false)}
            participant={participant}
            participants={participants}
            endingSubmissions={endingSubmissions}
            users={users}
            rejectedSubmission={rejectedSubmission}
          />
        </>
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
// Pulsing CTA — felt-green button with a breathing glow
// ---------------------------------------------------------------------------

function PulsingCTA({ label, onPress }: { label: string; onPress: () => void }) {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.3,
  }));

  return (
    <View>
      {/* Glow layer behind button */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            top: -5,
            left: -5,
            right: -5,
            bottom: -5,
            borderRadius: 16,
            backgroundColor: '#1a7d52',
          },
        ]}
      />
      <Pressable
        className="flex-row items-center justify-center gap-2 rounded-xl bg-felt-600 py-4 active:bg-felt-700"
        onPress={onPress}
      >
        <Text className="text-base font-sans-semibold text-white">{label}</Text>
        <IconChevronRight size={18} color="#fff" />
      </Pressable>
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
          Enviado: ${(submission.endingStackCents / 100).toLocaleString()} MXN
        </Text>
        <View className="rounded-full bg-gold-100 px-3 py-1 dark:bg-gold-900/40">
          <Text className="text-xs font-semibold text-gold-700 dark:text-gold-300">
            Pendiente de validación
          </Text>
        </View>
      </View>
      {submission.mediaKey && (
        <View className="mb-2">
          <PhotoThumbnail uri={submission.mediaKey} size={48} label="Ver foto" />
        </View>
      )}
      {submission.note && (
        <Text className="text-sm text-sand-500 dark:text-sand-400">
          Nota: {submission.note}
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
          Final: ${(submission.endingStackCents / 100).toLocaleString()} MXN
        </Text>
        <View className="rounded-full bg-felt-100 px-3 py-1 dark:bg-felt-900/40">
          <Text className="text-xs font-semibold text-felt-700 dark:text-felt-300">
            Validado
          </Text>
        </View>
      </View>
      {submission.note && (
        <Text className="text-sm text-sand-500 dark:text-sand-400">
          Nota: {submission.note}
        </Text>
      )}
    </View>
  );
}
