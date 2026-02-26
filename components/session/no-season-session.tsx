import { RefreshableScrollView } from '@/components/ui/refreshable-scroll-view';
import { useAppState } from '@/hooks/use-app-state';
import { Image } from 'expo-image';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PokerHandsButton } from './poker-hands-button';

export function NoSeasonSession() {
  const appState = useAppState();
  const insets = useSafeAreaInsets();

  const handleRefresh = useCallback(async () => {
    await appState.refreshIfStale(0);
  }, [appState]);

  return (
    <RefreshableScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="flex-1 items-center justify-center px-12"
      onRefresh={handleRefresh}
    >
      {/* Poker hands reference button */}
      <View className="absolute right-4" style={{ top: insets.top + 10 }}>
        <PokerHandsButton />
      </View>
      <Image
        source={require('@/assets/images/noseason.png')}
        style={{ width: 200, height: 200, marginBottom: 24 }}
        contentFit="contain"
      />
      <Text className="mb-2 text-2xl font-heading text-sand-950 dark:text-sand-50">
        No hay temporada activa
      </Text>
      <Text className="text-center text-base text-sand-500 dark:text-sand-400">
        Antes de programar juegos, hay que crear y activar una temporada. Revisa la pestaña
        Temporada para más detalles.
      </Text>
    </RefreshableScrollView>
  );
}
