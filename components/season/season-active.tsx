import { UserAvatar } from '@/components/ui/user-avatar';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import type { Season, SeasonHostOrder, SeasonMember, Session, User } from '@/types';
import { IconArrowsShuffle, IconCards, IconTrophy } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


type Props = {
  season: Season;
  members: SeasonMember[];
  hostOrder: SeasonHostOrder[];
  session: Session | null;
  users: User[];
};

export function SeasonActive({ season, members, hostOrder: hostOrderProp, session, users }: Props) {
  const router = useRouter();
  const auth = useAuth();
  const appState = useAppState();
  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canManage = isTreasurer || isAdmin;

  const treasurer = users.find((u) => u.id === season.treasurerUserId);
  const approvedCount = members.filter((m) => m.approvalStatus === 'approved').length;
  const currentMember = members.find((m) => m.userId === currentUser?.id);

  const [refreshing, setRefreshing] = useState(false);
  const hostOrder = [...hostOrderProp].sort((a, b) => a.sortIndex - b.sortIndex);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await appState.refresh();
    } finally {
      setRefreshing(false);
    }
  }, [appState]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779'; // sand-400 / sand-500
  const inset = useSafeAreaInsets();
  const paddingTop = inset.top + 10;

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="pb-12"
      style={{ paddingTop }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#c49a3c" />
      }
    >
      {/* Header */}
      <View className="px-6 pb-6">
        <Text
          className="mb-2 text-4xl font-heading text-sand-950 dark:text-sand-50"
          numberOfLines={1}
        >
          {season.name ?? 'Temporada Actual'}
        </Text>
        <View className="self-start rounded-full bg-felt-100 px-3 py-1 dark:bg-felt-900">
          <Text className="text-xs font-semibold text-felt-700 dark:text-felt-300">
            Activa
          </Text>
        </View>
      </View>

      {/* Balance Hero — full-bleed warm strip */}
      {currentMember && (
        <View className="bg-gold-50 px-6 py-8 dark:bg-gold-900/30">
          <Text className="mb-1 text-sm font-sans-medium text-gold-600 dark:text-gold-400">
            Tu Balance
          </Text>
          <Text className="text-3xl font-bold text-gold-800 dark:text-gold-200">
            ${(currentMember.currentBalanceCents / 100).toLocaleString()} MXN
          </Text>
        </View>
      )}

      {/* Season Info */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <SectionTitle icon={<IconTrophy size={18} color={iconColor} />} label="Temporada" />
        <InfoRow label="Tesorero" value={treasurer?.displayName ?? 'Unknown'} />
        <InfoRow label="Miembros" value={`${approvedCount} aprobados`} />
      </View>

      {/* Session */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <SectionTitle icon={<IconCards size={18} color={iconColor} />} label="Juego" />
        {!session && (
          <>
            <Text className="mb-5 text-sm text-sand-500 dark:text-sand-400">
              Sin juego programado
            </Text>
            {canManage && (
              <Pressable
                className="items-center rounded-full bg-gold-500 py-3.5 active:bg-gold-600"
                onPress={() => router.push('/schedule-session' as never)}
              >
                <Text className="text-sm font-semibold text-white">Programar Juego</Text>
              </Pressable>
            )}
          </>
        )}
        {session && (
          <>
            <SessionStatusRow session={session} users={users} />
            <Pressable
              className="mt-5 items-center rounded-full border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
              onPress={() => {
                router.push('/session' as never);
              }}
            >
              <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                Ver Juego
              </Text>
            </Pressable>
          </>
        )}
      </View>
     
      {/* Host Order */}
      {hostOrder.length > 0 && (
        <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
          <View className="flex-row items-center justify-between ">
            <SectionTitle icon={<IconArrowsShuffle size={18} color={iconColor} />} label="Rotación de Host" />
            {isAdmin && (
              <Pressable
                className="items-center justify-center py-1 active:opacity-70"
                onPress={() => router.push('/host-order' as never)}
              >
                <Text className="text-sm font-sans-semibold text-gold-600 dark:text-gold-400">
                  Editar
                </Text>
              </Pressable>
            )}
          </View>
          {hostOrder.map((ho, index) => {
            const user = userMap.get(ho.userId);
            if (!user) return null;
            return (
              <View
                key={ho.id}
                className="flex-row items-center gap-3 py-2.5"
              >
                <Text className="w-7 text-right text-xs font-sans-medium text-sand-400 dark:text-sand-500">
                  #{index + 1}
                </Text>
                <UserAvatar
                  displayName={user.displayName}
                  avatarMediaId={user.avatarMediaId}
                  size={35}
                  fallbackClassName="bg-felt-100 dark:bg-felt-900"
                  fallbackTextClassName="text-xs font-sans-semibold text-felt-600 dark:text-felt-300"
                />
                <Text className="text-sm font-sans-medium text-sand-950 dark:text-sand-50">
                  {user.displayName}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* End Season — Treasurer / Admin only */}
      {canManage && (() => {
        const sessionActive = session && (session.state === 'dealing' || session.state === 'in_progress' || session.state === 'closing');
        return (
          <View className="px-6 pt-8">
            {sessionActive && (
              <Text className="mb-3 text-center text-xs text-sand-500 dark:text-sand-400">
                No se puede terminar la temporada mientras un juego está activo
              </Text>
            )}
            <Pressable
              className={`items-center rounded-full py-3.5 ${
                sessionActive
                  ? 'bg-red-300 dark:bg-red-800'
                  : 'bg-red-600 active:bg-red-700'
              }`}
              onPress={() => router.push('/end-season' as never)}
              disabled={!!sessionActive}
            >
              <Text className="text-sm font-semibold text-white">Terminar Temporada</Text>
            </Pressable>
          </View>
        );
      })()}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Session status row
// ---------------------------------------------------------------------------

function SessionStatusRow({ session, users }: { session: Session; users: User[] }) {
  const host = users.find((u) => u.id === session.hostUserId);

  const stateLabel: Record<string, string> = {
    scheduled: 'Programado',
    dealing: 'Repartiendo',
    in_progress: 'En Juego',
    closing: 'Cerrando',
    finalized: 'Finalizado',
  };

  const stateBg: Record<string, string> = {
    scheduled: 'bg-gold-100 dark:bg-gold-900/40',
    dealing: 'bg-felt-100 dark:bg-felt-900/40',
    in_progress: 'bg-felt-100 dark:bg-felt-900/40',
    closing: 'bg-orange-100 dark:bg-orange-900/40',
    finalized: 'bg-sand-200 dark:bg-sand-700',
  };

  const stateText: Record<string, string> = {
    scheduled: 'text-gold-700 dark:text-gold-300',
    dealing: 'text-felt-700 dark:text-felt-300',
    in_progress: 'text-felt-700 dark:text-felt-300',
    closing: 'text-orange-700 dark:text-orange-300',
    finalized: 'text-sand-600 dark:text-sand-400',
  };

  return (
    <View>
      <View className="mb-4 flex-row items-center">
        <View className={`rounded-full px-3 py-1 ${stateBg[session.state] ?? ''}`}>
          <Text className={`text-xs font-semibold ${stateText[session.state] ?? ''}`}>
            {stateLabel[session.state] ?? session.state}
          </Text>
        </View>
      </View>
      <InfoRow label="Host" value={host?.displayName ?? 'Unknown'} />
     <View className='h-[4px]'/>
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
      <View className='h-[4px]'/>
      {session.location && <InfoRow label="Ubicación" value={session.location} />}
    </View>
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
