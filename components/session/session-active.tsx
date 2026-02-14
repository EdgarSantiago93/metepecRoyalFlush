import { Text, View } from 'react-native';
import type { Session, User } from '@/types';

type Props = {
  session: Session;
  users: User[];
};

export function SessionActive({ session, users }: Props) {
  const host = users.find((u) => u.id === session.hostUserId);

  return (
    <View className="flex-1 bg-sand-50 px-6 pt-16 dark:bg-sand-900">
      <Text className="mb-1 text-2xl font-bold text-sand-950 dark:text-sand-50">
        Active Session
      </Text>

      <View className="mt-1 mb-6 self-start rounded-full bg-felt-100 px-3 py-1 dark:bg-felt-900">
        <Text className="text-xs font-semibold text-felt-700 dark:text-felt-300">
          {session.state.replace('_', ' ')}
        </Text>
      </View>

      <View className="rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
        <InfoRow label="Host" value={host?.displayName ?? 'Unknown'} />
        {session.location && <InfoRow label="Location" value={session.location} />}
        <InfoRow label="State" value={session.state} />
      </View>

      <Text className="mt-6 text-center text-sm text-sand-500 dark:text-sand-400">
        Session management features coming soon.
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row items-center justify-between last:mb-0">
      <Text className="text-sm text-sand-500 dark:text-sand-400">{label}</Text>
      <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">{value}</Text>
    </View>
  );
}
