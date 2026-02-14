import { Text, View } from 'react-native';
import type { Session, User } from '@/types';

type Props = {
  session: Session;
  users: User[];
};

export function SessionActive({ session, users }: Props) {
  const host = users.find((u) => u.id === session.hostUserId);

  return (
    <View className="flex-1 bg-white px-6 pt-16 dark:bg-gray-900">
      <Text className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
        Active Session
      </Text>

      <View className="mt-1 mb-6 self-start rounded-full bg-green-100 px-3 py-1 dark:bg-green-900">
        <Text className="text-xs font-semibold text-green-700 dark:text-green-300">
          {session.state.replace('_', ' ')}
        </Text>
      </View>

      <View className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <InfoRow label="Host" value={host?.displayName ?? 'Unknown'} />
        {session.location && <InfoRow label="Location" value={session.location} />}
        <InfoRow label="State" value={session.state} />
      </View>

      <Text className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Session management features coming soon.
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row items-center justify-between last:mb-0">
      <Text className="text-sm text-gray-500 dark:text-gray-400">{label}</Text>
      <Text className="text-sm font-medium text-gray-900 dark:text-white">{value}</Text>
    </View>
  );
}
