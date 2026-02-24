import { SessionScheduleForm } from '@/components/session/session-schedule-form';
import { Loader } from '@/components/ui/loader';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/services/api/client';
import type { SeasonHostOrder } from '@/types';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, View } from 'react-native';

export default function ScheduleSessionScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ edit?: string }>();
  const auth = useAuth();
  const appState = useAppState();
  const isEdit = params.edit === '1';

  const [hostOrder, setHostOrder] = useState<SeasonHostOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Prevent back navigation while submitting
  useLayoutEffect(() => {
    navigation.setOptions({ gestureEnabled: !submitting });
  }, [navigation, submitting]);

  const season = appState.status === 'season_active' ? appState.season : null;
  const session = appState.status === 'season_active' ? appState.session : null;
  const users = appState.status === 'season_active' ? appState.users : [];
  const currentUser = auth.status === 'authenticated' ? auth.user : null;

  // Guard: must be active season
  useEffect(() => {
    if (appState.status !== 'loading' && appState.status !== 'season_active') {
      router.back();
    }
  }, [appState.status, router]);

  // Guard: must be Treasurer or Admin
  const isTreasurer = currentUser?.id === season?.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  useEffect(() => {
    if (currentUser && !isTreasurer && !isAdmin) {
      router.back();
    }
  }, [currentUser, isTreasurer, isAdmin, router]);

  // Load host order
  useEffect(() => {
    if (!season) return;
    api.getHostOrder(season.id).then((res) => {
      setHostOrder(res.hostOrder);
      setLoading(false);
    });
  }, [season]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
        <Loader size={80} />
      </View>
    );
  }

  const initialValues =
    isEdit && session
      ? {
          hostUserId: session.hostUserId,
          scheduledFor: session.scheduledFor,
          location: session.location,
        }
      : undefined;

  const handleSubmit = async (data: { hostUserId: string; scheduledFor?: string; location?: string }) => {
    setSubmitting(true);
    try {
      if (isEdit && session) {
        await appState.updateScheduledSession({
          sessionId: session.id,
          hostUserId: data.hostUserId,
          scheduledFor: data.scheduledFor ?? null,
          location: data.location ?? null,
        });
      } else if (season) {
        await appState.scheduleSession({
          seasonId: season.id,
          hostUserId: data.hostUserId,
          scheduledFor: data.scheduledFor,
          location: data.location,
        });
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar el juego');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SessionScheduleForm
      hostOrder={hostOrder}
      users={users}
      initialValues={initialValues}
      submitLabel={isEdit ? 'Guardar Cambios' : 'Programar Juego'}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
