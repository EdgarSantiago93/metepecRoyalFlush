import { ErrorView } from '@/components/ui/error-view';
import { LoadingView } from '@/components/ui/loading-view';
import { NoSeasonSession } from '@/components/session/no-season-session';
import { NoSession } from '@/components/session/no-session';
import { SessionActive } from '@/components/session/session-active';
import { useAppState } from '@/hooks/use-app-state';

export default function SessionScreen() {
  const appState = useAppState();

  switch (appState.status) {
    case 'loading':
      return <LoadingView />;
    case 'error':
      return <ErrorView message={appState.message} onRetry={appState.refresh} />;
    case 'no_season':
    case 'season_setup':
    case 'season_ended':
      return <NoSeasonSession />;
    case 'season_active':
      if (appState.session) {
        return (
          <SessionActive
            session={appState.session}
            season={appState.season}
            members={appState.members}
            participants={appState.participants}
            injections={appState.injections}
            endingSubmissions={appState.endingSubmissions}
            users={appState.users}
          />
        );
      }
      return (
        <NoSession
          season={appState.season}
          members={appState.members}
          users={appState.users}
        />
      );
  }
}
