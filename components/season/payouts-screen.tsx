import { ButtonActivityIndicator } from '@/components/ui/button-activity-indicator';
import { PhotoThumbnail } from '@/components/ui/photo-viewer';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import { uploadMedia } from '@/services/media/upload';
import { pickMedia } from '@/utils/media-picker';
import { IconAlertTriangle, IconCash, IconCheck, IconClock, IconCopy } from '@tabler/icons-react-native';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Toast from 'react-native-simple-toast';

import type { SeasonMember, SeasonPayout, User } from '@/types';

export function PayoutsScreen() {
  const appState = useAppState();
  const auth = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [proofUri, setProofUri] = useState<string | null>(null);

  const handlePickProof = useCallback(async () => {
    const uri = await pickMedia({ quality: 0.7 });
    if (uri) setProofUri(uri);
  }, []);

  const handleSendPayout = useCallback(async () => {
    if (appState.status !== 'season_ended' || !selectedUserId) return;
    const member = appState.members.find((m) => m.userId === selectedUserId && m.approvalStatus === 'approved');
    if (!member) return;
    setLoading(true);
    try {
      let proofMediaKey: string | undefined;
      if (proofUri) {
        const result = await uploadMedia(proofUri);
        proofMediaKey = result.mediaKey;
      }
      await appState.sendPayout({
        seasonId: appState.season.id,
        toUserId: selectedUserId,
        amountCents: member.currentBalanceCents,
        proofMediaKey,
      });
      setSelectedUserId(null);
      setProofUri(null);
    } catch (e) {
      Toast.showWithGravity(
        e instanceof Error ? e.message : 'No se pudo enviar el pago',
        Toast.SHORT,
        Toast.TOP,
      );
    } finally {
      setLoading(false);
    }
  }, [appState, selectedUserId, proofUri]);

  const handleCopy = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Toast.showWithGravity(
      `✅ ${text} copiado`,
      Toast.SHORT,
      Toast.TOP,
    );
  }, []);

  if (appState.status !== 'season_ended') return null;

  const { members, users, payouts, season } = appState;
  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canManage = isTreasurer || isAdmin;

  const userMap = new Map<string, User>(users.map((u) => [u.id, u]));
  const payoutMap = new Map<string, SeasonPayout>(payouts.map((p) => [p.toUserId, p]));

  // All approved members sorted by balance (highest first)
  const approvedMembers = members
    .filter((m) => m.approvalStatus === 'approved')
    .sort((a, b) => b.currentBalanceCents - a.currentBalanceCents);

  const selectedUser = selectedUserId ? userMap.get(selectedUserId) : null;
  const selectedMember = selectedUserId ? approvedMembers.find((m) => m.userId === selectedUserId) : null;
  const selectedPayout = selectedUserId ? payoutMap.get(selectedUserId) : null;

  // Stats
  const totalPayouts = approvedMembers.length;
  const completedPayouts = payouts.filter((p) => p.status === 'confirmed').length;
  const disputedPayouts = payouts.filter((p) => p.status === 'disputed').length;

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="px-6 pt-6 pb-8"
    >
      {/* Header */}
      <Text className="mb-1 text-xl font-heading text-sand-950 dark:text-sand-50">
        Pagos de Temporada
      </Text>
      <Text className="mb-5 text-sm text-sand-500 dark:text-sand-400">
        Gestiona las transferencias a cada jugador.
      </Text>

      {/* Stats Summary */}
      <View className="mb-5 flex-row gap-3">
        <StatCard
          label="Completados"
          value={`${completedPayouts}/${totalPayouts}`}
          icon={<IconCheck size={16} color="#1a7d52" />}
          bgClass="bg-felt-50 dark:bg-felt-900/40"
        />
        <StatCard
          label="Pendientes"
          value={`${payouts.filter((p) => p.status === 'pending').length}`}
          icon={<IconClock size={16} color="#c49a3c" />}
          bgClass="bg-gold-50 dark:bg-gold-900/40"
        />
        {disputedPayouts > 0 && (
          <StatCard
            label="Disputados"
            value={`${disputedPayouts}`}
            icon={<IconAlertTriangle size={16} color="#dc2626" />}
            bgClass="bg-red-50 dark:bg-red-950"
          />
        )}
      </View>

      {/* Player List */}
      <View className="rounded-xl border border-sand-200 bg-sand-100 dark:border-sand-700 dark:bg-sand-800">
        {approvedMembers.map((member, index) => {
          const user = userMap.get(member.userId);
          const payout = payoutMap.get(member.userId);
          const isLast = index === approvedMembers.length - 1;

          return (
            <PlayerPayoutRow
              key={member.id}
              member={member}
              user={user}
              payout={payout}
              isLast={isLast}
              canManage={canManage}
              onPress={() => setSelectedUserId(member.userId)}
            />
          );
        })}
      </View>

      {/* Banking Info Modal */}
      <Modal
        visible={!!selectedUserId}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedUserId(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-sand-50 p-6 dark:bg-sand-800">
            {selectedUser && selectedMember && (
              <>
                {/* Player Info */}
                <Text className="mb-1 text-lg font-bold text-sand-950 dark:text-sand-50">
                  {selectedUser.displayName}
                </Text>
                <Text className="mb-4 font-mono-bold text-2xl text-gold-600 dark:text-gold-400">
                  ${(selectedMember.currentBalanceCents / 100).toLocaleString()} MXN
                </Text>

                {/* Payout Status */}
                {selectedPayout && (
                  <View className="mb-4 rounded-lg border border-sand-200 bg-sand-100 p-3 dark:border-sand-700 dark:bg-sand-750">
                    <View className="flex-row items-center gap-2">
                      <PayoutStatusIcon status={selectedPayout.status} />
                      <Text className="text-sm font-medium text-sand-700 dark:text-sand-300">
                        {selectedPayout.status === 'pending' && 'Enviado — esperando confirmación'}
                        {selectedPayout.status === 'confirmed' && 'Confirmado por jugador'}
                        {selectedPayout.status === 'disputed' && 'Disputado'}
                      </Text>
                    </View>
                    {selectedPayout.disputeNote && (
                      <Text className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {selectedPayout.disputeNote}
                      </Text>
                    )}
                  </View>
                )}

                {/* Banking Info */}
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-500 dark:text-sand-400">
                  Datos Bancarios
                </Text>
                <View className="mb-4 rounded-lg border border-sand-200 bg-sand-50 p-3 dark:border-sand-700 dark:bg-sand-900">
                  {selectedUser.bankingNombre || selectedUser.bankingCuenta || selectedUser.bankingBanco || selectedUser.bankingClabe ? (
                    <>
                      <BankField label="Nombre" value={selectedUser.bankingNombre} onCopy={handleCopy} />
                      <BankField label="Banco" value={selectedUser.bankingBanco} onCopy={handleCopy} />
                      <BankField label="Cuenta" value={selectedUser.bankingCuenta} onCopy={handleCopy} />
                      <BankField label="CLABE" value={selectedUser.bankingClabe} onCopy={handleCopy} />
                    </>
                  ) : (
                    <Text className="text-sm text-sand-400 dark:text-sand-500">
                      Sin datos bancarios registrados
                    </Text>
                  )}
                </View>

                {/* Actions */}
                <View className="gap-3">
                  {canManage && !selectedPayout && (
                    <>
                      {/* Optional proof photo */}
                      <View className="mb-1">
                        {proofUri ? (
                          <View className="flex-row items-center gap-3">
                            <PhotoThumbnail uri={proofUri} size={48} />
                            <Pressable onPress={() => setProofUri(null)}>
                              <Text className="text-xs text-red-500">Eliminar foto</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            className="items-center rounded-full border border-dashed border-sand-300 py-2.5 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
                            onPress={handlePickProof}
                          >
                            <Text className="text-xs text-sand-500 dark:text-sand-400">
                              Adjuntar comprobante (opcional)
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      <Pressable
                        className={`items-center rounded-full py-3.5 ${loading ? 'bg-gold-300 dark:bg-gold-700' : 'bg-gold-500 active:bg-gold-600'}`}
                        onPress={handleSendPayout}
                        disabled={loading}
                      >
                        {loading ? (
                          <ButtonActivityIndicator />
                        ) : (
                          <Text className="text-sm font-semibold text-white">
                            Depósito Confirmado
                          </Text>
                        )}
                      </Pressable>
                    </>
                  )}

                  <Pressable
                    className="items-center rounded-full border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
                    onPress={() => { setSelectedUserId(null); setProofUri(null); }}
                    disabled={loading}
                  >
                    <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                      Cerrar
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  bgClass,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  bgClass: string;
}) {
  return (
    <View className={`flex-1 rounded-xl p-3 ${bgClass}`}>
      <View className="mb-1 flex-row items-center gap-1.5">
        {icon}
        <Text className="text-xs text-sand-500 dark:text-sand-400">{label}</Text>
      </View>
      <Text className="text-lg font-bold text-sand-950 dark:text-sand-50">{value}</Text>
    </View>
  );
}

function PlayerPayoutRow({
  member,
  user,
  payout,
  isLast,
  canManage,
  onPress,
}: {
  member: SeasonMember;
  user: User | undefined;
  payout: SeasonPayout | undefined;
  isLast: boolean;
  canManage: boolean;
  onPress: () => void;
}) {
  const balanceMxn = member.currentBalanceCents / 100;

  return (
    <Pressable
      className={`flex-row items-center px-4 py-3.5 active:bg-sand-200 dark:active:bg-sand-700 ${
        !isLast ? 'border-b border-sand-200 dark:border-sand-700' : ''
      }`}
      onPress={onPress}
      disabled={!canManage && !payout}
    >
      {/* Status icon */}
      <View className="mr-3">
        {payout ? (
          <PayoutStatusIcon status={payout.status} />
        ) : (
          <IconCash size={18} color="#a8a29e" />
        )}
      </View>

      {/* Name + status text */}
      <View className="flex-1">
        <Text className="text-sm text-sand-950 dark:text-sand-50">
          {user?.displayName ?? 'Unknown'}
        </Text>
        {payout && (
          <Text className={`text-xs ${
            payout.status === 'confirmed' ? 'text-felt-600 dark:text-felt-400' :
            payout.status === 'disputed' ? 'text-red-600 dark:text-red-400' :
            'text-gold-600 dark:text-gold-400'
          }`}>
            {payout.status === 'confirmed' && 'Confirmado'}
            {payout.status === 'disputed' && 'Disputado'}
            {payout.status === 'pending' && 'Enviado'}
          </Text>
        )}
        {!payout && (
          <Text className="text-xs text-sand-400 dark:text-sand-500">Sin enviar</Text>
        )}
      </View>

      {/* Amount */}
      <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">
        ${balanceMxn.toLocaleString()}
      </Text>
    </Pressable>
  );
}

function PayoutStatusIcon({ status }: { status: SeasonPayout['status'] }) {
  switch (status) {
    case 'confirmed':
      return <IconCheck size={18} color="#1a7d52" />;
    case 'disputed':
      return <IconAlertTriangle size={18} color="#dc2626" />;
    case 'pending':
      return <IconClock size={18} color="#c49a3c" />;
  }
}

function BankField({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string | null;
  onCopy: (text: string) => void;
}) {
  if (!value) return null;

  return (
    <View className="mb-2 last:mb-0">
      <Text className="font-mono text-xs text-sand-400 dark:text-sand-500">{label}</Text>
      <Pressable className="flex-row items-center gap-1.5" onPress={() => onCopy(value)}>
        <Text className="font-mono text-sm text-sand-950 dark:text-sand-50">{value}</Text>
        <IconCopy size={14} color="#a8a29e" />
      </Pressable>
    </View>
  );
}
