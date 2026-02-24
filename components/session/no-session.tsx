import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import type { Season, SeasonMember, User } from '@/types';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PokerHandsButton } from './poker-hands-button';

type Props = {
  season: Season;
  members: SeasonMember[];
  users: User[];
};

export function NoSession({ season, users }: Props) {
  const router = useRouter();
  const auth = useAuth();
  const appState = useAppState();
  const insets = useSafeAreaInsets();
  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canSchedule = isTreasurer || isAdmin;

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await appState.refresh();
    } finally {
      setRefreshing(false);
    }
  }, [appState]);

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerStyle={{ flexGrow: 1 }}
      contentContainerClassName="items-center justify-center px-6"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#c49a3c" />
      }
    >
      {/* Poker hands reference button */}
      <View className="absolute right-4" style={{ top: insets.top + 10 }}>
        <PokerHandsButton />
      </View>
        <Image
          source={require('@/assets/images/nogame.png')}
          style={{ width: 200, height: 200, marginBottom: 24 }}
          contentFit="contain"
        />
      <Text className="mb-2 text-2xl font-heading text-sand-950 dark:text-sand-50">
        Sin Juego Programado
      </Text>
      {canSchedule ? (
        <>
          <Text className="mb-6 text-center text-base text-sand-500 dark:text-sand-400">
            Programa la próxima noche de juego para el grupo.
          </Text>
          <Pressable
            className="rounded-full bg-gold-500 px-8 py-3 active:bg-gold-600"
            onPress={() => router.push('/schedule-session' as never)}
          >
            <Text className="text-base font-semibold text-white">Programar Juego</Text>
          </Pressable>
        </>
      ) : (
        <Text className="text-center text-base text-sand-500 dark:text-sand-400">
          Esperando a que el tesorero programe la próxima noche de juego.
        </Text>
      )}
    </ScrollView>
  );
}
