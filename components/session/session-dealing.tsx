import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';
import type { Season, SeasonMember, Session, SessionParticipant, User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import { IconCards, IconUsers } from '@tabler/icons-react-native';
import { DealingPlayerView } from './dealing-player-view';
import { DealingRoster } from './dealing-roster';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779';

  const inset = useSafeAreaInsets();
  const paddingTop = inset.top + 10;

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
      return `Se necesitan al menos 2 jugadores con check in (${checkedIn.length} ahora)`;
    }
    if (disputed.length > 0) {
      return `${disputed.length} disputa${disputed.length > 1 ? 's' : ''} necesita${disputed.length === 1 ? '' : 'n'} resolverse`;
    }
    if (unconfirmed.length > 0) {
      return `Esperando ${unconfirmed.length} confirmación${unconfirmed.length > 1 ? 'es' : ''} más`;
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
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo iniciar el juego');
    } finally {
      setStarting(false);
    }
  }, [appState]);

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="pb-12"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      style={{ paddingTop }}
    >
      {/* Header */}
      <View className="px-6 pb-6">
        <Text className="mb-2 text-2xl font-heading text-sand-950 dark:text-sand-50">
          Repartiendo
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-gold-100 px-3 py-1 dark:bg-gold-900">
            <Text className="text-xs font-semibold text-gold-700 dark:text-gold-300">
              Reparto
            </Text>
          </View>
          {host && (
            <Text className="text-sm text-sand-500 dark:text-sand-400">
              Host: {host.displayName}
              {session.location ? ` · ${session.location}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Progress Hero — full-bleed gold strip */}
      <View className="bg-gold-50 px-6 py-8 dark:bg-gold-900/30">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-sans-medium text-gold-600 dark:text-gold-400">
            Confirmados
          </Text>
          <Text className="text-sm font-sans-semibold text-gold-800 dark:text-gold-200">
            {confirmed.length} de {participants.length}
          </Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-gold-200 dark:bg-gold-800">
          <View
            className="h-full rounded-full bg-gold-500"
            style={{ width: `${participants.length > 0 ? (confirmed.length / participants.length) * 100 : 0}%` }}
          />
        </View>

        {canManage && (
          <View className="mt-6">
            <Pressable
              className={`items-center rounded-full py-3.5 ${
                canStart && !starting
                  ? 'bg-felt-600 active:bg-felt-700'
                  : 'bg-sand-300 dark:bg-sand-700'
              }`}
              onPress={() => setShowStartModal(true)}
              disabled={!canStart || starting}
            >
              <Text
                className={`text-base font-semibold ${
                  canStart ? 'text-white' : 'text-sand-500 dark:text-sand-400'
                }`}
              >
                Comenzar Juego
              </Text>
            </Pressable>

            {disabledReason && (
              <Text className="mt-3 text-center text-xs text-gold-600 dark:text-gold-400">
                {disabledReason}
              </Text>
            )}
          </View>
        )}

        {!canManage && (
          <Text className="mt-4 text-center text-sm text-gold-600 dark:text-gold-400">
            Esperando a que el tesorero inicie el juego.
          </Text>
        )}
      </View>

      {/* Player view — personal check-in / confirm / dispute */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <SectionTitle icon={<IconCards size={18} color={iconColor} />} label="Tu Check-In" />
        <DealingPlayerView participant={myParticipant} />
      </View>

      {/* Treasurer/Admin roster */}
      {canManage && (
        <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
          <SectionTitle icon={<IconUsers size={18} color={iconColor} />} label="Roster" />
          <DealingRoster participants={participants} users={users} />
        </View>
      )}

      <ConfirmationModal
        visible={showStartModal}
        title="Iniciar Juego"
        message={`¿Iniciar el juego? ${confirmed.length} jugador${confirmed.length !== 1 ? 'es' : ''} confirmado${confirmed.length !== 1 ? 's' : ''} y listo${confirmed.length !== 1 ? 's' : ''} para jugar.`}
        confirmLabel="Iniciar"
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
