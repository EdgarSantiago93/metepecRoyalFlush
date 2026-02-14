import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import type { Season, SeasonMember, User } from '@/types';

type Props = {
  season: Season;
  members: SeasonMember[];
  users: User[];
};

export function NoSession({ season, users }: Props) {
  const router = useRouter();
  const auth = useAuth();
  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canSchedule = isTreasurer || isAdmin;

  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
      <Text className="mb-2 text-2xl font-bold text-sand-950 dark:text-sand-50">
        No Session Scheduled
      </Text>
      {canSchedule ? (
        <>
          <Text className="mb-6 text-center text-base text-sand-500 dark:text-sand-400">
            Schedule the next game night for the group.
          </Text>
          <Pressable
            className="rounded-lg bg-gold-500 px-8 py-3 active:bg-gold-600"
            onPress={() => router.push('/schedule-session' as never)}
          >
            <Text className="text-base font-semibold text-white">Schedule Session</Text>
          </Pressable>
        </>
      ) : (
        <Text className="text-center text-base text-sand-500 dark:text-sand-400">
          Waiting for the treasurer to schedule the next game night.
        </Text>
      )}
    </View>
  );
}
