import { Text, View } from 'react-native';
import type { Season, SeasonMember, User } from '@/types';

type Props = {
  season: Season;
  members: SeasonMember[];
  users: User[];
};

export function LedgerContent({ season, members, users }: Props) {
  return (
    <View className="flex-1 bg-white px-6 pt-16 dark:bg-gray-900">
      <Text className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
        Ledger
      </Text>
      <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {season.name ?? 'Current Season'}
      </Text>

      <View className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        {members.map((member) => {
          const user = users.find((u) => u.id === member.userId);
          return (
            <View
              key={member.id}
              className="mb-2 flex-row items-center justify-between last:mb-0"
            >
              <Text className="text-sm text-gray-900 dark:text-white">
                {user?.displayName ?? 'Unknown'}
              </Text>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ${(member.currentBalanceCents / 100).toLocaleString()} MXN
              </Text>
            </View>
          );
        })}
      </View>

      <Text className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Full ledger views coming soon.
      </Text>
    </View>
  );
}
