import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import { api } from '@/services/api/client';
import { StatusBadge } from '@/components/ui/status-badge';
import type { SeasonDepositSubmission } from '@/types';

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
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit deposit');
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
        <Text className="mb-2 text-xl font-bold text-sand-950 dark:text-sand-50">
          Deposit Approved
        </Text>
        <Text className="mb-6 text-center text-sm text-sand-500 dark:text-sand-400">
          Your deposit has been approved by the treasurer. You&apos;re all set for this season.
        </Text>
        <Pressable
          className="rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
          onPress={() => router.back()}
        >
          <Text className="text-base font-semibold text-white">Back to Dashboard</Text>
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
          <Text className="mt-4 mb-2 text-xl font-bold text-sand-950 dark:text-sand-50">
            Awaiting Review
          </Text>
          <Text className="mb-6 text-center text-sm text-sand-500 dark:text-sand-400">
            Your deposit proof is being reviewed by the treasurer.
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
              Note: {existingSubmission.note}
            </Text>
          )}
          <Pressable
            className="rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
            onPress={() => router.back()}
          >
            <Text className="text-base font-semibold text-white">Back to Dashboard</Text>
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
              Deposit Rejected
            </Text>
            <Text className="text-sm text-red-600 dark:text-red-400">
              {currentMember.rejectionNote}
            </Text>
          </View>
        )}

        <Text className="mb-1 text-lg font-bold text-sand-950 dark:text-sand-50">
          Upload Deposit Proof
        </Text>
        <Text className="mb-6 text-sm text-sand-500 dark:text-sand-400">
          Take a photo or choose from your library to submit your deposit proof.
        </Text>

        {/* Photo picker */}
        {photoUri ? (
          <Pressable className="mb-4" onPress={() => setPhotoUri(null)}>
            <View className="overflow-hidden rounded-xl border border-sand-200 dark:border-sand-700">
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: 200 }} contentFit="cover" />
            </View>
            <Text className="mt-2 text-center text-xs text-sand-500 dark:text-sand-400">
              Tap to remove
            </Text>
          </Pressable>
        ) : (
          <View className="mb-4 flex-row gap-3">
            <Pressable
              className="flex-1 items-center rounded-lg border border-sand-300 py-4 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
              onPress={() => pickImage('camera')}
            >
              <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                Camera
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 items-center rounded-lg border border-sand-300 py-4 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
              onPress={() => pickImage('library')}
            >
              <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                Library
              </Text>
            </Pressable>
          </View>
        )}

        {/* Optional note */}
        <Text className="mb-2 text-sm font-semibold text-sand-700 dark:text-sand-300">
          Note (optional)
        </Text>
        <TextInput
          className="mb-6 rounded-lg border border-sand-300 bg-sand-100 px-4 py-3 text-base text-sand-950 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-50"
          placeholder="e.g. SPEI transfer"
          placeholderTextColor="#b5ac9e"
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
            <ActivityIndicator color="white" />
          ) : (
            <Text
              className={`text-base font-semibold ${
                photoUri ? 'text-white' : 'text-sand-500 dark:text-sand-400'
              }`}
            >
              Submit Deposit Proof
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
