import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { SessionInjection, SessionParticipant } from '@/types';
import { useAppState } from '@/hooks/use-app-state';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

type Props = {
  participant: SessionParticipant | null;
  injections: SessionInjection[];
};

export function InProgressPlayerView({ participant, injections }: Props) {
  if (!participant) {
    return (
      <View className="mx-6 mb-4 rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
        <Text className="text-sm text-sand-500 dark:text-sand-400">
          You are not a participant in this session.
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
    <View className="mx-6 mb-4">
      {/* Stats card */}
      <View className="mb-3 rounded-xl border border-felt-300 bg-felt-50 p-4 dark:border-felt-700 dark:bg-felt-900/30">
        <Text className="mb-2 text-base font-semibold text-felt-800 dark:text-felt-200">
          Your Session
        </Text>
        <View className="flex-row justify-between">
          <StatItem label="Starting" value={`${formattedStack} MXN`} />
          <StatItem label="Rebuys" value={`${formattedApproved} MXN`} />
          {pendingCount > 0 && (
            <StatItem label="Pending" value={`${pendingCount}`} accent />
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
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!result.canceled && result.assets[0]) {
        setProofUri(result.assets[0].uri);
      }
      return;
    }

    // Fall back to media library
    const libStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (libStatus.status !== 'granted') {
      Alert.alert('Permission needed', 'Camera or photo library access is required to attach proof.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setProofUri(result.assets[0].uri);
    }
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
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to request rebuy');
    } finally {
      setLoading(false);
    }
  }, [appState, rebuyType, proofUri]);

  const amount = rebuyType === 'rebuy_500' ? '$500' : '$250';

  return (
    <>
      <View className="flex-row gap-3">
        <Pressable
          className="flex-1 items-center rounded-lg bg-gold-500 py-3 active:bg-gold-600"
          onPress={() => handleRequest('rebuy_500')}
        >
          <Text className="text-sm font-semibold text-white">Rebuy $500</Text>
        </Pressable>
        <Pressable
          className="flex-1 items-center rounded-lg border border-gold-500 py-3 active:bg-gold-50 dark:active:bg-gold-900/30"
          onPress={() => handleRequest('half_250')}
        >
          <Text className="text-sm font-semibold text-gold-600 dark:text-gold-400">Rebuy $250</Text>
        </Pressable>
      </View>

      <ConfirmationModal
        visible={showModal}
        title={`Request ${amount} MXN Rebuy`}
        message="The treasurer will need to approve this rebuy request."
        confirmLabel="Request"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => {
          setShowModal(false);
          setProofUri(null);
        }}
        loading={loading}
      >
        {proofUri ? (
          <View className="items-center gap-2">
            <Image
              source={{ uri: proofUri }}
              className="h-24 w-24 rounded-lg"
              resizeMode="cover"
            />
            <Pressable onPress={() => setProofUri(null)}>
              <Text className="text-xs text-red-500">Remove photo</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            className="items-center rounded-lg border border-dashed border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
            onPress={handlePickImage}
          >
            <Text className="text-sm text-sand-500 dark:text-sand-400">
              Attach proof photo (optional)
            </Text>
          </Pressable>
        )}
      </ConfirmationModal>
    </>
  );
}
