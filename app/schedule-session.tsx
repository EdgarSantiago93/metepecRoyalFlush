import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import { api } from '@/services/api/client';
import { SessionScheduleForm } from '@/components/session/session-schedule-form';
import type { SeasonHostOrder } from '@/types';

export default function ScheduleSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();
  const auth = useAuth();
  const appState = useAppState();
  const isEdit = params.edit === '1';

  const [hostOrder, setHostOrder] = useState<SeasonHostOrder[]>([]);
  const [loading, setLoading] = useState(true);

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
        <ActivityIndicator size="large" />
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
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save session');
    }
  };

  return (
    <SessionScheduleForm
      hostOrder={hostOrder}
      users={users}
      initialValues={initialValues}
      submitLabel={isEdit ? 'Save Changes' : 'Schedule Session'}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
