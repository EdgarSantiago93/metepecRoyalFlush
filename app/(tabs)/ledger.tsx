import { ErrorView } from '@/components/ui/error-view';
import { LoadingView } from '@/components/ui/loading-view';
import { NoSeasonLedger } from '@/components/ledger/no-season-ledger';
import { LedgerContent } from '@/components/ledger/ledger-content';
import { useAppState } from '@/hooks/use-app-state';

export default function LedgerScreen() {
  const appState = useAppState();

  switch (appState.status) {
    case 'loading':
      return <LoadingView />;
    case 'error':
      return <ErrorView message={appState.message} onRetry={appState.refresh} />;
    case 'no_season':
      return <NoSeasonLedger />;
    case 'season_setup':
    case 'season_active':
    case 'season_ended':
      return (
        <LedgerContent
          season={appState.season}
          members={appState.members}
          users={appState.users}
        />
      );
  }
}
