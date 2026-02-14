import { useCallback } from 'react';
import { ErrorView } from '@/components/ui/error-view';
import { LoadingView } from '@/components/ui/loading-view';
import { NoSeason } from '@/components/season/no-season';
import { SeasonSetup } from '@/components/season/season-setup';
import { SeasonActive } from '@/components/season/season-active';
import { SeasonEnded } from '@/components/season/season-ended';
import { useAppState } from '@/hooks/use-app-state';

export default function SeasonScreen() {
  const appState = useAppState();
  const { createSeason } = appState;

  const handleCreateSeason = useCallback(
    async (treasurerUserId: string, name?: string) => {
      await createSeason({ treasurerUserId, name });
    },
    [createSeason],
  );

  switch (appState.status) {
    case 'loading':
      return <LoadingView />;
    case 'error':
      return <ErrorView message={appState.message} onRetry={appState.refresh} />;
    case 'no_season':
      return <NoSeason users={appState.users} onCreateSeason={handleCreateSeason} />;
    case 'season_setup':
      return (
        <SeasonSetup
          season={appState.season}
          members={appState.members}
          users={appState.users}
        />
      );
    case 'season_active':
      return (
        <SeasonActive
          season={appState.season}
          members={appState.members}
          session={appState.session}
          users={appState.users}
        />
      );
    case 'season_ended':
      return (
        <SeasonEnded
          season={appState.season}
          users={appState.users}
          onCreateSeason={handleCreateSeason}
        />
      );
  }
}
