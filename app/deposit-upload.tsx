import { AppTextInput } from '@/components/ui/app-text-input';
import { ButtonActivityIndicator } from '@/components/ui/button-activity-indicator';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAppState } from '@/hooks/use-app-state';
import { api } from '@/services/api/client';
import type { SeasonDepositSubmission } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

export default function DepositUploadScreen() {
  const auth = useAuth();
  const appState = useAppState();
  const router = useRouter();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<SeasonDepositSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const season = appState.status === 'season_setup' ? appState.season : null;
  const members = appState.status === 'season_setup' ? appState.members : [];
  const currentMember = members.find((m) => m.userId === currentUser?.id);

  useEffect(() => {
    if (!season) return;
    api.getDepositSubmissions(season.id).then((res) => {
      const mine = res.submissions
        .filter((s) => s.userId === currentUser?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      setExistingSubmission(mine ?? null);
      setLoading(false);
    });
  }, [season, currentUser?.id]);

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!photoUri || !season || !currentUser || submitting) return;
    setSubmitting(true);
    try {
      await api.submitDeposit({
        seasonId: season.id,
        userId: currentUser.id,
        photoUri,
        note: note.trim() || undefined,
      });
      await appState.refresh();
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo enviar el depósito');
    } finally {
      setSubmitting(false);
    }
  }, [photoUri, season, currentUser, submitting, note, appState, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Already approved
  if (currentMember?.approvalStatus === 'approved') {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-felt-100 dark:bg-felt-900/40">
          <Text className="text-3xl">✓</Text>
        </View>
        <Text className="mb-2 text-xl font-heading text-sand-950 dark:text-sand-50">
          Depósito Aprobado
        </Text>
        <Text className="mb-6 text-center text-sm text-sand-500 dark:text-sand-400">
          Tu depósito fue aprobado por el tesorero. Estás listo para esta temporada.
        </Text>
        <Pressable
          className="rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
          onPress={() => router.back()}
        >
          <Text className="text-base font-semibold text-white">Regresar al Inicio</Text>
        </Pressable>
      </View>
    );
  }

  // Pending submission
  if (currentMember?.approvalStatus === 'pending' && existingSubmission) {
    return (
      <View className="flex-1 bg-sand-50 dark:bg-sand-900">
        <ScrollView className="flex-1" contentContainerClassName="items-center px-6 py-8">
          <StatusBadge variant="pending" />
          <Text className="mt-4 mb-2 text-xl font-heading text-sand-950 dark:text-sand-50">
            En Revisión
          </Text>
          <Text className="mb-6 text-center text-sm text-sand-500 dark:text-sand-400">
            Tu comprobante de depósito está siendo revisado por el tesorero.
          </Text>
          {existingSubmission.photoUrl && (
            <View className="mb-4 w-full overflow-hidden rounded-xl border border-sand-200 dark:border-sand-700">
              <Image
                source={{ uri: existingSubmission.photoUrl }}
                style={{ width: '100%', height: 200 }}
                contentFit="cover"
              />
            </View>
          )}
          {existingSubmission.note && (
            <Text className="mb-4 text-sm text-sand-500 dark:text-sand-400">
              Nota: {existingSubmission.note}
            </Text>
          )}
          <Pressable
            className="rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
            onPress={() => router.back()}
          >
            <Text className="text-base font-semibold text-white">Regresar al Inicio</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // Rejected — show note + allow re-upload
  const showRejectionNote = currentMember?.approvalStatus === 'rejected' && currentMember.rejectionNote;

  return (
    <View className="flex-1 bg-sand-50 dark:bg-sand-900">
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-6">
        {showRejectionNote && (
          <View className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <Text className="mb-1 text-sm font-semibold text-red-700 dark:text-red-300">
              Depósito Rechazado
            </Text>
            <Text className="text-sm text-red-600 dark:text-red-400">
              {currentMember.rejectionNote}
            </Text>
          </View>
        )}

        <Text className="mb-1 text-lg font-bold text-sand-950 dark:text-sand-50">
          Subir Comprobante de Depósito
        </Text>
        <Text className="mb-6 text-sm text-sand-500 dark:text-sand-400">
          Toma una foto o elige de tu galería para enviar tu comprobante de depósito.
        </Text>

        {/* Photo picker */}
        {photoUri ? (
          <Pressable className="mb-4" onPress={() => setPhotoUri(null)}>
            <View className="overflow-hidden rounded-xl border border-sand-200 dark:border-sand-700">
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: 200 }} contentFit="cover" />
            </View>
            <Text className="mt-2 text-center text-xs text-sand-500 dark:text-sand-400">
              Toca para eliminar
            </Text>
          </Pressable>
        ) : (
          <View className="mb-4 flex-row gap-3">
            <Pressable
              className="flex-1 items-center rounded-lg border border-sand-300 py-4 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
              onPress={() => pickImage('camera')}
            >
              <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                Cámara
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 items-center rounded-lg border border-sand-300 py-4 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
              onPress={() => pickImage('library')}
            >
              <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                Galería
              </Text>
            </Pressable>
          </View>
        )}

        {/* Optional note */}
        <Text className="mb-2 text-sm font-semibold text-sand-700 dark:text-sand-300">
          Nota (opcional)
        </Text>
        <AppTextInput
          className="mb-6"
          placeholder="ej. Transferencia SPEI"
          value={note}
          onChangeText={setNote}
          editable={!submitting}
        />

        {/* Submit */}
        <Pressable
          className={`items-center rounded-lg py-3.5 ${
            photoUri && !submitting
              ? 'bg-gold-500 active:bg-gold-600'
              : 'bg-sand-300 dark:bg-sand-700'
          }`}
          onPress={handleSubmit}
          disabled={!photoUri || submitting}
        >
          {submitting ? (
            <ButtonActivityIndicator />
          ) : (
            <Text
              className={`text-base font-semibold ${
                photoUri ? 'text-white' : 'text-sand-500 dark:text-sand-400'
              }`}
            >
              Enviar Comprobante de Depósito
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
