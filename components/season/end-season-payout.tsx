import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import type { SeasonMember, User } from '@/types';
import { IconBrandWhatsapp } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

export function EndSeasonPayout() {
  const router = useRouter();
  const appState = useAppState();
  const auth = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const tableRef = useRef<ViewShot>(null);

  const handleShare = useCallback(async () => {
    if (!tableRef.current?.capture) return;
    setSharing(true);
    try {
      const uri = await tableRef.current.capture();
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Compartir no está disponible en este dispositivo');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartir Reporte de Pagos',
        UTI: 'public.png',
      });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo compartir');
    } finally {
      setSharing(false);
    }
  }, []);

  const handleEndSeason = useCallback(async () => {
    setLoading(true);
    try {
      await appState.endSeason();
      setShowConfirm(false);
      router.replace('/(tabs)');
    } catch (e) {
      setLoading(false);
      setShowConfirm(false);
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo terminar la temporada');
    }
  }, [appState, router]);

  if (appState.status !== 'season_active') return null;

  const { members, users } = appState;
  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === appState.season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canEnd = isTreasurer || isAdmin;

  const userMap = new Map<string, User>(users.map((u) => [u.id, u]));

  // Only approved members
  const approvedMembers = members
    .filter((m) => m.approvalStatus === 'approved')
    .sort((a, b) => b.currentBalanceCents - a.currentBalanceCents);

  const totalCents = approvedMembers.reduce((sum, m) => sum + m.currentBalanceCents, 0);

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="px-6 pt-6 pb-8"
    >
      {/* Header */}
      <Text className="mb-1 text-xl font-heading text-sand-950 dark:text-sand-50">
        Reporte de Pagos
      </Text>
      <Text className="mb-6 text-sm text-sand-500 dark:text-sand-400">
        Balances finales de todos los miembros aprobados. Terminar la temporada es permanente.
      </Text>

      {/* Payout Table (wrapped in ViewShot for screenshot capture) */}
      <ViewShot
        ref={tableRef}
        options={{ format: 'png', quality: 1, result: Platform.OS === 'web' ? 'base64' : 'tmpfile' }}
      >
        <View className="rounded-xl border border-sand-200 bg-sand-100 dark:border-sand-700 dark:bg-sand-800">
          {/* Table Header */}
          <View className="flex-row items-center border-b border-sand-200 px-4 py-3 dark:border-sand-700">
            <Text className="flex-1 text-xs font-semibold uppercase tracking-wide text-sand-500 dark:text-sand-400">
              Jugador
            </Text>
            <Text className="text-xs font-semibold uppercase tracking-wide text-sand-500 dark:text-sand-400">
              Balance (MXN)
            </Text>
          </View>

          {/* Member Rows */}
          {approvedMembers.map((member, index) => (
            <PayoutRow
              key={member.id}
              member={member}
              user={userMap.get(member.userId)}
              isLast={index === approvedMembers.length - 1}
            />
          ))}

          {/* Total Row */}
          <View className="flex-row items-center border-t border-sand-300 px-4 py-3 dark:border-sand-600">
            <Text className="flex-1 text-sm font-bold text-sand-950 dark:text-sand-50">
              Total
            </Text>
            <Text className="text-sm font-bold text-sand-950 dark:text-sand-50">
              ${(totalCents / 100).toLocaleString()}
            </Text>
          </View>
        </View>
      </ViewShot>

      {/* Actions */}
      {canEnd && (
        <View className="mt-6 gap-3">
          {/* Share to WhatsApp */}
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 active:bg-[#1ebe57]"
            onPress={handleShare}
            disabled={sharing}
          >
            <IconBrandWhatsapp size={20} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">
              {sharing ? 'Compartiendo...' : 'Enviar a WhatsApp'}
            </Text>
          </Pressable>

          {/* End Season */}
          <Pressable
            className="items-center rounded-full bg-red-600 py-3.5 active:bg-red-700"
            onPress={() => setShowConfirm(true)}
          >
            <Text className="text-sm font-semibold text-white">Terminar Temporada</Text>
          </Pressable>
        </View>
      )}

      <ConfirmationModal
        visible={showConfirm}
        title="Terminar Temporada"
        message="Esto terminará permanentemente la temporada actual. Todos los balances serán finalizados y no se podrán jugar más juegos. Esta acción no se puede deshacer."
        confirmLabel="Terminar"
        variant="destructive"
        onConfirm={handleEndSeason}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </ScrollView>
  );
}

function PayoutRow({
  member,
  user,
  isLast,
}: {
  member: SeasonMember;
  user: User | undefined;
  isLast: boolean;
}) {
  const balanceMxn = member.currentBalanceCents / 100;

  return (
    <View
      className={`flex-row items-center px-4 py-3 ${
        !isLast ? 'border-b border-sand-200 dark:border-sand-700' : ''
      }`}
    >
      <Text className="flex-1 text-sm text-sand-950 dark:text-sand-50">
        {user?.displayName ?? 'Unknown'}
      </Text>
      <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">
        ${balanceMxn.toLocaleString()}
      </Text>
    </View>
  );
}
