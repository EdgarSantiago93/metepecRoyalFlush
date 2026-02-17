import { ButtonActivityIndicator } from '@/components/ui/button-activity-indicator';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import type { EndingSubmission, Season, SeasonMember, Session, SessionFinalizeNote, SessionInjection, SessionParticipant, User } from '@/types';
import { IconCalendar } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SessionClosing } from './session-closing';
import { SessionDealing } from './session-dealing';
import { SessionFinalized } from './session-finalized';
import { SessionInProgress } from './session-in-progress';

type Props = {
  session: Session;
  season: Season;
  members: SeasonMember[];
  participants: SessionParticipant[];
  injections: SessionInjection[];
  endingSubmissions: EndingSubmission[];
  finalizeNote: SessionFinalizeNote | null;
  users: User[];
};

export function SessionActive({ session, season, members, participants, injections, endingSubmissions, finalizeNote, users }: Props) {
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

  // finalized — read-only session summary
  return (
    <SessionFinalized
      session={session}
      season={season}
      members={members}
      participants={participants}
      injections={injections}
      endingSubmissions={endingSubmissions}
      finalizeNote={finalizeNote}
      users={users}
    />
  );
}

// ---------------------------------------------------------------------------
// Scheduled sub-component
// ---------------------------------------------------------------------------

function SessionScheduled({ session, season, users }: Omit<Props, 'participants' | 'injections' | 'endingSubmissions' | 'finalizeNote'>) {
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

  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779';

  const inset = useSafeAreaInsets();
  const paddingTop = inset.top + 10;

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
      contentContainerClassName="pb-12"
      style={{ paddingTop }}
    >
      {/* Header */}
      <View className="px-6 pb-6">
        <Text className="mb-2 text-2xl font-heading text-sand-950 dark:text-sand-50">
          Juego Programado
        </Text>
        <View className="self-start rounded-full bg-gold-100 px-3 py-1 dark:bg-gold-900">
          <Text className="text-xs font-semibold text-gold-700 dark:text-gold-300">
            Programado
          </Text>
        </View>
      </View>

      {/* Session details */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <SectionTitle icon={<IconCalendar size={18} color={iconColor} />} label="Detalles" />
        <InfoRow label="Host" value={host?.displayName ?? 'Unknown'} />
        {session.scheduledFor && (
          <InfoRow
            label="Cuándo"
            value={new Date(session.scheduledFor).toLocaleDateString('es-MX', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        )}
        {session.location && <InfoRow label="Ubicación" value={session.location} />}
        {scheduledBy && <InfoRow label="Programado por" value={scheduledBy.displayName} />}
      </View>

      {/* Action buttons for Treasurer/Admin */}
      {canManage && (
        <View className="px-6 py-6">
          <View className="gap-3">
            <Pressable
              className={`items-center rounded-full py-3.5 ${
                !starting ? 'bg-gold-500 active:bg-gold-600' : 'bg-sand-300 dark:bg-sand-700'
              }`}
              onPress={() => setShowStartModal(true)}
              disabled={starting}
            >
              {starting ? (
                <ButtonActivityIndicator />
              ) : (
                <Text className="text-base font-semibold text-white">Iniciar Juego</Text>
              )}
            </Pressable>
            <Pressable
              className="items-center rounded-full border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
              onPress={() => router.push('/schedule-session?edit=1' as never)}
              disabled={starting}
            >
              <Text className="text-base font-semibold text-sand-700 dark:text-sand-300">
                Editar Programación
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {!canManage && (
        <View className="px-6 py-6">
          <Text className="text-center text-sm text-sand-500 dark:text-sand-400">
            Esperando a que el tesorero inicie el juego.
          </Text>
        </View>
      )}

      <ConfirmationModal
        visible={showStartModal}
        title="Iniciar Juego"
        message="¿Iniciar la fase de reparto? Los jugadores podrán hacer check in y recibir su stack inicial."
        confirmLabel="Iniciar Juego"
        cancelLabel="Cancelar"
        onConfirm={handleStart}
        onCancel={() => setShowStartModal(false)}
        loading={starting}
      />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="mb-4 flex-row items-center gap-2">
      {icon}
      <Text className="text-base font-sans-bold text-sand-950 dark:text-sand-50">
        {label}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 flex-row items-center justify-between last:mb-0">
      <Text className="text-sm text-sand-500 dark:text-sand-400">{label}</Text>
      <Text className="text-sm font-sans-semibold text-sand-950 dark:text-sand-50">{value}</Text>
    </View>
  );
}
