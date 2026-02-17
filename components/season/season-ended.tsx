import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { IconCash } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import type { Season, SeasonPayout, User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { CreateSeasonForm } from './create-season-form';

type Props = {
  season: Season;
  users: User[];
  payouts: SeasonPayout[];
  onCreateSeason: (treasurerUserId: string, name?: string) => Promise<void>;
};

export function SeasonEnded({ season, users, payouts, onCreateSeason }: Props) {
  const router = useRouter();
  const auth = useAuth();
  const [showForm, setShowForm] = useState(false);

  if (auth.status !== 'authenticated') return null;

  const isAdmin = auth.user.isAdmin;
  const isTreasurer = auth.user.id === season.treasurerUserId;
  const canManagePayouts = isTreasurer || isAdmin;

  // Payout stats for the badge
  const totalMembers = payouts.length > 0 ? payouts.length : 0;
  const confirmedPayouts = payouts.filter((p) => p.status === 'confirmed').length;
  const disputedPayouts = payouts.filter((p) => p.status === 'disputed').length;

  if (showForm && isAdmin) {
    return (
      <CreateSeasonForm
        users={users}
        onSubmit={onCreateSeason}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
      <Text className="mb-2 text-2xl font-heading text-sand-950 dark:text-sand-50">
        Temporada Finalizada
      </Text>
      <Text className="mb-1 text-base text-sand-500 dark:text-sand-400">
        {season.name ?? 'Temporada Anterior'}
      </Text>
      <Text className="mb-8 text-center text-sm text-sand-400 dark:text-sand-500">
        {isAdmin
          ? 'Inicia una nueva temporada para seguir jugando.'
          : 'Esperando a que un admin cree una nueva temporada.'}
      </Text>

      {/* Dispute banner for current user */}
      {(() => {
        const myPayout = payouts.find((p) => p.toUserId === auth.user.id);
        if (!myPayout) return null;
        if (myPayout.status === 'disputed') {
          return (
            <View className="mb-4 w-full rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
              <Text className="text-sm font-semibold text-red-700 dark:text-red-300">
                Pago en disputa
              </Text>
              {myPayout.disputeNote && (
                <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {myPayout.disputeNote}
                </Text>
              )}
            </View>
          );
        }
        if (myPayout.status === 'pending') {
          return (
            <View className="mb-4 w-full rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Pago pendiente de confirmación
              </Text>
              <Text className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                El tesorero ha marcado tu pago como enviado. Confirma la recepción.
              </Text>
            </View>
          );
        }
        if (myPayout.status === 'confirmed') {
          return (
            <View className="mb-4 w-full rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
              <Text className="text-sm font-semibold text-green-700 dark:text-green-300">
                Pago confirmado
              </Text>
            </View>
          );
        }
        return null;
      })()}

      <View className="w-full gap-3">
        {/* Payouts button — treasurer + admin */}
        {canManagePayouts && (
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
            onPress={() => router.push('/payouts')}
          >
            <IconCash size={20} color="#ffffff" />
            <Text className="text-base font-semibold text-white">Pagos</Text>
            {totalMembers > 0 && (
              <View className="ml-1 rounded-full bg-white/20 px-2 py-0.5">
                <Text className="text-xs font-semibold text-white">
                  {confirmedPayouts}/{totalMembers}
                  {disputedPayouts > 0 ? ` · ${disputedPayouts} disputas` : ''}
                </Text>
              </View>
            )}
          </Pressable>
        )}

        {/* Create new season — admin only */}
        {isAdmin && (
          <Pressable
            className="items-center rounded-lg border border-sand-300 px-6 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
            onPress={() => setShowForm(true)}
          >
            <Text className="text-base font-semibold text-sand-700 dark:text-sand-300">
              Crear Nueva Temporada
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
