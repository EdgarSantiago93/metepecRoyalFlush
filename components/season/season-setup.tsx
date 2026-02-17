import { MemberRow } from '@/components/ui/member-row';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/services/api/client';
import type { Season, SeasonHostOrder, SeasonMember, User } from '@/types';
import { IconClipboardCheck, IconUsers } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  season: Season;
  members: SeasonMember[];
  users: User[];
};

export function SeasonSetup({ season, members, users }: Props) {
  const auth = useAuth();
  const appState = useAppState();
  const router = useRouter();

  const [hostOrder, setHostOrder] = useState<SeasonHostOrder[]>([]);
  const [starting, setStarting] = useState(false);

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;

  const treasurer = users.find((u) => u.id === season.treasurerUserId);
  const approvedCount = members.filter((m) => m.approvalStatus === 'approved').length;
  const canStart = approvedCount >= 2;

  const currentMember = members.find((m) => m.userId === currentUser?.id);
  const needsDeposit =
    currentMember &&
    (currentMember.approvalStatus === 'not_submitted' ||
      currentMember.approvalStatus === 'rejected');

  const hasActions = needsDeposit || isTreasurer || isAdmin;

  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779'; // sand-400 / sand-500

  const inset = useSafeAreaInsets();
  const paddingTop = inset.top + 10;

  useEffect(() => {
    api.getHostOrder(season.id).then((res) => setHostOrder(res.hostOrder));
  }, [season.id]);

  const handleStartSeason = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      await appState.startSeason();
    } catch {
      // error handled by context
    } finally {
      setStarting(false);
    }
  }, [appState, starting]);

  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.displayName ?? 'Unknown';

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="pb-12"
      style={{ paddingTop }}
    >
      {/* Header */}
      <View className="px-6 pb-6">
        <Text className="mb-2 text-2xl font-heading text-sand-950 dark:text-sand-50">
          {season.name ?? 'Nueva Temporada'}
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-gold-100 px-3 py-1 dark:bg-gold-900">
            <Text className="text-xs font-semibold text-gold-700 dark:text-gold-300">
              Configuraciónss
            </Text>
          </View>
          <Text className="text-sm text-sand-500 dark:text-sand-400">
            Tesorero: {treasurer?.displayName ?? 'Unknown'}
          </Text>
        </View>
      </View>

      {/* Progress Hero — full-bleed felt strip */}
      <View className="bg-felt-50 px-6 py-8 dark:bg-felt-900/20">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-sans-medium text-felt-700 dark:text-felt-300">
            Aprobados
          </Text>
          <Text className="text-sm font-sans-semibold text-felt-800 dark:text-felt-200">
            {approvedCount} de {members.length}
          </Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-felt-200 dark:bg-felt-800">
          <View
            className="h-full rounded-full bg-felt-500"
            style={{ width: `${members.length > 0 ? (approvedCount / members.length) * 100 : 0}%` }}
          />
        </View>

        {isTreasurer && (
          <View className="mt-6">
            <Pressable
              testID="btn-start-season"
              className={`items-center rounded-full py-3.5 ${
                canStart && !starting
                  ? 'bg-felt-600 active:bg-felt-700'
                  : 'bg-sand-300 dark:bg-sand-700'
              }`}
              onPress={handleStartSeason}
              disabled={!canStart || starting}
            >
              {starting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  className={`text-base font-semibold ${
                    canStart ? 'text-white' : 'text-sand-500 dark:text-sand-400'
                  }`}
                >
                  Iniciar Temporada
                </Text>
              )}
            </Pressable>
            {!canStart && (
              <Text className="mt-3 text-center text-xs text-felt-600 dark:text-felt-400">
                Se necesitan al menos 2 miembros aprobados
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Actions */}
      {hasActions && (
        <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
          <SectionTitle icon={<IconClipboardCheck size={18} color={iconColor} />} label="Acciones" />
          <View className="gap-3">
            {needsDeposit && (
              <ActionButton
                testID="btn-upload-deposit"
                label="Subir Comprobante de Depósito"
                onPress={() => router.push('/deposit-upload')}
              />
            )}
            {isTreasurer && (
              <ActionButton
                testID="btn-review-deposits"
                label="Revisar Depósitos"
                onPress={() => router.push('/deposit-approvals')}
                variant="gold"
              />
            )}
            {isAdmin && (
              <>
                <ActionButton
                  testID="btn-edit-host-order"
                  label="Editar Orden de Host"
                  onPress={() => router.push('/host-order')}
                />
                <ActionButton
                  testID="btn-season-settings"
                  label="Ajustes de Temporada"
                  onPress={() => router.push('/season-settings')}
                  variant="outline"
                />
              </>
            )}
          </View>
        </View>
      )}

      {/* Members */}
      <View className="px-6 py-6">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <IconUsers size={18} color={iconColor} />
            <Text className="text-base font-sans-bold text-sand-950 dark:text-sand-50">
              Miembros
            </Text>
          </View>
          {isAdmin && (
            <Pressable onPress={() => router.push('/host-order')}>
              <Text className="text-sm font-semibold text-gold-600 dark:text-gold-400">
                Editar
              </Text>
            </Pressable>
          )}
        </View>
        {(() => {
          const sorted = [...members].sort((a, b) => {
            const posA = hostOrder.findIndex((h) => h.userId === a.userId);
            const posB = hostOrder.findIndex((h) => h.userId === b.userId);
            return (posA >= 0 ? posA : Infinity) - (posB >= 0 ? posB : Infinity);
          });
          return sorted.map((member, i) => {
            const hostPos = hostOrder.findIndex((h) => h.userId === member.userId);
            return (
              <View
                key={member.id}
                className={i < sorted.length - 1 ? 'border-b border-sand-200 dark:border-sand-700' : ''}
              >
                <MemberRow
                  name={getUserName(member.userId)}
                  right={
                    <View className="flex-row items-center gap-2">
                      {hostPos >= 0 && (
                        <View className="h-6 w-6 items-center justify-center rounded-full bg-sand-200 dark:bg-sand-600">
                          <Text className="text-[10px] font-bold text-sand-600 dark:text-sand-300">
                            {hostPos + 1}
                          </Text>
                        </View>
                      )}
                      <StatusBadge variant={member.approvalStatus} />
                    </View>
                  }
                  onPress={
                    member.userId === currentUser?.id && needsDeposit
                      ? () => router.push('/deposit-upload')
                      : undefined
                  }
                />
              </View>
            );
          });
        })()}
      </View>
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

function ActionButton({
  label,
  onPress,
  variant = 'default',
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'gold' | 'outline';
  testID?: string;
}) {
  const bgClass =
    variant === 'gold'
      ? 'bg-gold-500 active:bg-gold-600'
      : variant === 'outline'
        ? 'border border-sand-300 dark:border-sand-600 active:bg-sand-100 dark:active:bg-sand-800'
        : 'bg-felt-600 active:bg-felt-700';

  const textClass =
    variant === 'outline'
      ? 'text-sand-700 dark:text-sand-300'
      : 'text-white';

  return (
    <Pressable testID={testID} className={`items-center rounded-full py-3 ${bgClass}`} onPress={onPress}>
      <Text className={`text-sm font-semibold ${textClass}`}>{label}</Text>
    </Pressable>
  );
}
