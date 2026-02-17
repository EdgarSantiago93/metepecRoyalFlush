import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import { PayoutsScreen } from '@/components/season/payouts-screen';

export default function PayoutsRoute() {
  const router = useRouter();
  const auth = useAuth();
  const appState = useAppState();

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const season = appState.status === 'season_ended' ? appState.season : null;
  const isTreasurer = currentUser?.id === season?.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;

  // Guard: must be ended season and Treasurer or Admin
  useEffect(() => {
    if (appState.status !== 'loading' && appState.status !== 'season_ended') {
      router.back();
    }
  }, [appState.status, router]);

  useEffect(() => {
    if (currentUser && !isTreasurer && !isAdmin) {
      router.back();
    }
  }, [currentUser, isTreasurer, isAdmin, router]);

  return <PayoutsScreen />;
}
