import { Text, View } from 'react-native';
import type { Season, SeasonMember, User } from '@/types';

type Props = {
  season: Season;
  members: SeasonMember[];
  users: User[];
};

export function LedgerContent({ season, members, users }: Props) {
  return (
    <View className="flex-1 bg-sand-50 px-6 pt-16 dark:bg-sand-900">
      <Text className="mb-1 text-2xl font-bold text-sand-950 dark:text-sand-50">
        Ledger
      </Text>
      <Text className="mb-6 text-sm text-sand-500 dark:text-sand-400">
        {season.name ?? 'Current Season'}
      </Text>

      <View className="rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
        {members.map((member) => {
          const user = users.find((u) => u.id === member.userId);
          return (
            <View
              key={member.id}
              className="mb-2 flex-row items-center justify-between last:mb-0"
            >
              <Text className="text-sm text-sand-950 dark:text-sand-50">
                {user?.displayName ?? 'Unknown'}
              </Text>
              <Text className="text-sm font-medium text-sand-700 dark:text-sand-300">
                ${(member.currentBalanceCents / 100).toLocaleString()} MXN
              </Text>
            </View>
          );
        })}
      </View>

      <Text className="mt-6 text-center text-sm text-sand-500 dark:text-sand-400">
        Full ledger views coming soon.
      </Text>
    </View>
  );
}
