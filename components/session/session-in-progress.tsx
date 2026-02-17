import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import type { Season, SeasonMember, Session, SessionInjection, SessionParticipant, User } from '@/types';
import { IconCards, IconChecklist, IconMeat, IconUsers } from '@tabler/icons-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InProgressPlayerView } from './in-progress-player-view';
import { InProgressRoster } from './in-progress-roster';
import { RebuyApprovals } from './rebuy-approvals';

type Props = {
  session: Session;
  season: Season;
  members: SeasonMember[];
  participants: SessionParticipant[];
  injections: SessionInjection[];
  users: User[];
};

export function SessionInProgress({ session, season, members, participants, injections, users }: Props) {
  const auth = useAuth();
  const appState = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [ending, setEnding] = useState(false);

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canManage = isTreasurer || isAdmin;

  const host = users.find((u) => u.id === session.hostUserId);

  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779';

  const inset = useSafeAreaInsets();
  const paddingTop = inset.top + 10;

  // Current user's participant record
  const myParticipant = useMemo(
    () => participants.find((p) => p.userId === currentUser?.id) ?? null,
    [participants, currentUser?.id],
  );

  // Approved injections feed (chronological, only approved)
  const approvedFeed = useMemo(
    () =>
      injections
        .filter((inj) => inj.status === 'approved')
        .sort((a, b) => new Date(b.reviewedAt!).getTime() - new Date(a.reviewedAt!).getTime()),
    [injections],
  );

  const pendingCount = injections.filter((inj) => inj.status === 'pending').length;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([appState.refreshParticipants(), appState.refreshInjections()]);
    } finally {
      setRefreshing(false);
    }
  }, [appState]);

  const handleEndSession = useCallback(async () => {
    setEnding(true);
    try {
      await appState.endSession();
      setShowEndModal(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo terminar el juego');
    } finally {
      setEnding(false);
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
          Juego En Curso
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-felt-100 px-3 py-1 dark:bg-felt-900">
            <Text className="text-xs font-semibold text-felt-700 dark:text-felt-300">
              En Juego
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

      {/* Status Hero — full-bleed felt strip */}
      <View className="bg-felt-50 px-6 py-8 dark:bg-felt-900/20">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-sans-medium text-felt-700 dark:text-felt-300">
            Jugadores
          </Text>
          <Text className="text-sm font-sans-semibold text-felt-800 dark:text-felt-200">
            {participants.length} en mesa
          </Text>
        </View>
        {pendingCount > 0 && canManage && (
          <View className="mt-3 self-start rounded-full bg-gold-500 px-3 py-1">
            <Text className="text-xs font-semibold text-white">
              {pendingCount} ribeye{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Player view — personal stats + rebuy request */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <SectionTitle icon={<IconCards size={18} color={iconColor} />} label="Tu Juego" />
        <InProgressPlayerView participant={myParticipant} injections={injections} />
      </View>

    
    {canManage && (
        <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
          <SectionTitle icon={<IconChecklist size={18} color={iconColor} />} label="Solicitudes de Ribeye" />
          <RebuyApprovals
            injections={injections}
            participants={participants}
            users={users}
          />
        </View>
      )}

      {/* Participants roster */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <SectionTitle icon={<IconUsers size={18} color={iconColor} />} label="Jugadores" />
        <InProgressRoster
          participants={participants}
          injections={injections}
          users={users}
        />
      </View>

      {/* Approved rebuys feed */}
      {approvedFeed.length > 0 && (
        <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
          <SectionTitle icon={<IconMeat size={18} color={iconColor} />} label="Ribeyes Aprobados" />
          {approvedFeed.map((inj) => {
            const participant = participants.find((p) => p.id === inj.participantId);
            const user = users.find((u) => u.id === participant?.userId);
            const name = user?.displayName ?? participant?.guestName ?? 'Unknown';
            const amount = `$${(inj.amountCents / 100).toLocaleString()} MXN`;
            const time = new Date(inj.reviewedAt!).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View
                key={inj.id}
                className="mb-2.5 flex-row items-center justify-between last:mb-0"
              >
                <View className="flex-1">
                  <Text className="text-sm font-sans-medium text-sand-950 dark:text-sand-50">
                    {name}
                  </Text>
                  <Text className="text-xs text-sand-500 dark:text-sand-400">
                    {time}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-felt-600 dark:text-felt-400">
                  +{amount}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* End Session button (treasurer/admin) */}
      {canManage && (
        <View className="px-6 pt-8">
          <Pressable
            className="items-center rounded-full border border-red-300 py-3.5 active:bg-red-50 dark:border-red-700 dark:active:bg-red-900/30"
            onPress={() => setShowEndModal(true)}
          >
            <Text className="text-base font-semibold text-red-600 dark:text-red-400">
              Terminar Juego
            </Text>
          </Pressable>
        </View>
      )}

      <ConfirmationModal
        visible={showEndModal}
        title="Terminar Juego"
        message="¿Terminar este juego y pasar a la fase de cierre? No se permitirán más ribeyes después de este punto."
        confirmLabel="Terminar Juego"
        variant="destructive"
        onConfirm={handleEndSession}
        onCancel={() => setShowEndModal(false)}
        loading={ending}
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
