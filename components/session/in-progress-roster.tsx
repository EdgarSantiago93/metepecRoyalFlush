import { Text, View } from 'react-native';
import type { SessionInjection, SessionParticipant, User } from '@/types';

type Props = {
  participants: SessionParticipant[];
  injections: SessionInjection[];
  users: User[];
};

export function InProgressRoster({ participants, injections, users }: Props) {
  return (
    <View className="mx-6 mb-4">
      <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
        Players
      </Text>

      {/* Header */}
      <View className="flex-row rounded-t-lg border border-b-0 border-sand-200 bg-sand-200/50 px-3 py-2 dark:border-sand-700 dark:bg-sand-800">
        <Text className="flex-1 text-xs font-semibold text-sand-600 dark:text-sand-400">
          Name
        </Text>
        <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
          Start
        </Text>
        <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
          Rebuys
        </Text>
        <Text className="w-16 text-right text-xs font-semibold text-sand-600 dark:text-sand-400">
          Total In
        </Text>
      </View>

      {/* Rows */}
      {participants.map((p, i) => {
        const user = users.find((u) => u.id === p.userId);
        const name = user?.displayName ?? p.guestName ?? 'Unknown';
        const approvedRebuys = injections
          .filter((inj) => inj.participantId === p.id && inj.status === 'approved')
          .reduce((sum, inj) => sum + inj.amountCents, 0);
        const totalIn = p.startingStackCents + approvedRebuys;
        const isLast = i === participants.length - 1;

        return (
          <View
            key={p.id}
            className={`flex-row items-center border border-t-0 border-sand-200 bg-sand-50 px-3 py-3 dark:border-sand-700 dark:bg-sand-800/50 ${
              isLast ? 'rounded-b-lg' : ''
            }`}
          >
            <Text
              className="flex-1 text-sm font-medium text-sand-950 dark:text-sand-50"
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text className="w-16 text-center text-sm text-sand-600 dark:text-sand-300">
              ${(p.startingStackCents / 100).toLocaleString()}
            </Text>
            <Text className="w-16 text-center text-sm text-sand-600 dark:text-sand-300">
              {approvedRebuys > 0
                ? `$${(approvedRebuys / 100).toLocaleString()}`
                : '-'}
            </Text>
            <Text className="w-16 text-right text-sm font-medium text-sand-950 dark:text-sand-50">
              ${(totalIn / 100).toLocaleString()}
            </Text>
          </View>
        );
      })}

      {participants.length === 0 && (
        <View className="rounded-b-lg border border-sand-200 px-3 py-6 dark:border-sand-700">
          <Text className="text-center text-sm text-sand-400 dark:text-sand-500">
            No participants
          </Text>
        </View>
      )}
    </View>
  );
}
