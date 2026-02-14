import { Text, View } from 'react-native';
import type { Season, SeasonMember, Session, User } from '@/types';

type Props = {
  season: Season;
  members: SeasonMember[];
  session: Session | null;
  users: User[];
};

export function SeasonActive({ season, members, session, users }: Props) {
  const treasurer = users.find((u) => u.id === season.treasurerUserId);
  const approvedCount = members.filter((m) => m.approvalStatus === 'approved').length;

  return (
    <View className="flex-1 bg-sand-50 px-6 pt-16 dark:bg-sand-900">
      <Text className="mb-1 text-2xl font-bold text-sand-950 dark:text-sand-50">
        {season.name ?? 'Current Season'}
      </Text>

      <View className="mt-1 mb-6 self-start rounded-full bg-felt-100 px-3 py-1 dark:bg-felt-900">
        <Text className="text-xs font-semibold text-felt-700 dark:text-felt-300">
          Active
        </Text>
      </View>

      <View className="rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
        <InfoRow label="Treasurer" value={treasurer?.displayName ?? 'Unknown'} />
        <InfoRow label="Members" value={`${approvedCount} approved`} />
        <InfoRow
          label="Session"
          value={session ? `In progress (${session.state})` : 'No active session'}
        />
      </View>

      <Text className="mt-6 text-center text-sm text-sand-500 dark:text-sand-400">
        Season management features coming soon.
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
