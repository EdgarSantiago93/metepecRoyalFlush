import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import { EndSeasonPayout } from '@/components/season/end-season-payout';

export default function EndSeasonScreen() {
  const router = useRouter();
  const auth = useAuth();
  const appState = useAppState();

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const season = appState.status === 'season_active' ? appState.season : null;
  const isTreasurer = currentUser?.id === season?.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;

  // Guard: must be active season and Treasurer or Admin
  useEffect(() => {
    if (appState.status !== 'loading' && appState.status !== 'season_active') {
      router.back();
    }
  }, [appState.status, router]);

  useEffect(() => {
    if (currentUser && !isTreasurer && !isAdmin) {
      router.back();
    }
  }, [currentUser, isTreasurer, isAdmin, router]);

  return <EndSeasonPayout />;
}
