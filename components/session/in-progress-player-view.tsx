import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import type { SessionInjection, SessionParticipant } from '@/types';
import { useAppState } from '@/hooks/use-app-state';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { PhotoThumbnail } from '@/components/ui/photo-viewer';
import { pickMedia } from '@/utils/media-picker';

type Props = {
  participant: SessionParticipant | null;
  injections: SessionInjection[];
};

export function InProgressPlayerView({ participant, injections }: Props) {
  if (!participant) {
    return (
      <View className="rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
        <Text className="text-sm text-sand-500 dark:text-sand-400">
          No eres participante en este juego.
        </Text>
      </View>
    );
  }

  const myInjections = injections.filter((inj) => inj.participantId === participant.id);
  const approvedTotal = myInjections
    .filter((inj) => inj.status === 'approved')
    .reduce((sum, inj) => sum + inj.amountCents, 0);
  const pendingCount = myInjections.filter((inj) => inj.status === 'pending').length;

  const formattedStack = `$${(participant.startingStackCents / 100).toLocaleString()}`;
  const formattedApproved = `$${(approvedTotal / 100).toLocaleString()}`;

  return (
    <View>
      {/* Stats card */}
      <View className="mb-3 rounded-xl border border-felt-300 bg-felt-50 p-4 dark:border-felt-700 dark:bg-felt-900/30">
        <Text className="mb-2 text-base font-semibold text-felt-800 dark:text-felt-200">
          Tu Juego
        </Text>
        <View className="flex-row justify-between">
          <StatItem label="Inicio" value={`${formattedStack} MXN`} />
          <StatItem label="Ribeyes" value={`${formattedApproved} MXN`} />
          {pendingCount > 0 && (
            <StatItem label="Pendiente" value={`${pendingCount}`} accent />
          )}
        </View>
      </View>

      {/* Rebuy request buttons */}
      <RebuyActions />
    </View>
  );
}

function StatItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="items-center">
      <Text className="text-xs text-sand-500 dark:text-sand-400">{label}</Text>
      <Text
        className={`text-sm font-bold ${
          accent
            ? 'text-gold-600 dark:text-gold-400'
            : 'text-sand-950 dark:text-sand-50'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Rebuy request actions
// ---------------------------------------------------------------------------

function RebuyActions() {
  const appState = useAppState();
  const [showModal, setShowModal] = useState(false);
  const [rebuyType, setRebuyType] = useState<'rebuy_500' | 'half_250'>('rebuy_500');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = useCallback(async () => {
    const uri = await pickMedia({ quality: 0.7 });
    if (uri) setProofUri(uri);
  }, []);

  const handleRequest = useCallback(
    (type: 'rebuy_500' | 'half_250') => {
      setRebuyType(type);
      setProofUri(null);
      setShowModal(true);
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await appState.requestRebuy(rebuyType, proofUri ?? undefined);
      setShowModal(false);
      setProofUri(null);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo solicitar el ribeye');
    } finally {
      setLoading(false);
    }
  }, [appState, rebuyType, proofUri]);

  const amount = rebuyType === 'rebuy_500' ? '$500' : '$250';

  return (
    <>
      <View className="flex-row gap-3">
        <Pressable
          className="flex-1 items-center rounded-full bg-gold-500 py-4 active:bg-gold-600"
          onPress={() => handleRequest('rebuy_500')}
        >
          <Text className="text-base font-semibold text-white">Ribeye $500</Text>
        </Pressable>
        <Pressable
          className="flex-1 items-center rounded-full border border-gold-500 py-4 active:bg-gold-50 dark:active:bg-gold-900/30"
          onPress={() => handleRequest('half_250')}
        >
          <Text className="text-base font-semibold text-gold-600 dark:text-gold-400">Ribeye $250</Text>
        </Pressable>
      </View>

      <ConfirmationModal
        visible={showModal}
        title={`Solicitar Ribeye de ${amount} MXN`}
        message="El tesorero necesitará aprobar esta solicitud de ribeye."
        confirmLabel="Solicitar"
        onConfirm={handleConfirm}
        onCancel={() => {
          setShowModal(false);
          setProofUri(null);
        }}
        loading={loading}
      >
        {proofUri ? (
          <View className="items-center gap-2">
            <PhotoThumbnail uri={proofUri} size={48} />
            <Pressable onPress={() => setProofUri(null)}>
              <Text className="text-xs text-red-500">Eliminar foto</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            className="items-center rounded-full border border-dashed border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
            onPress={handlePickImage}
          >
            <Text className="text-sm text-sand-500 dark:text-sand-400">
              Adjuntar foto de comprobante (opcional)
            </Text>
          </Pressable>
        )}
      </ConfirmationModal>
    </>
  );
}
