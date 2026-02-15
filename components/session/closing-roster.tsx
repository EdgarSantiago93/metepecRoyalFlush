import { Text, View } from 'react-native';
import type { EndingSubmission, SessionInjection, SessionParticipant, User } from '@/types';

type Props = {
  participants: SessionParticipant[];
  injections: SessionInjection[];
  endingSubmissions: EndingSubmission[];
  users: User[];
};

/** Return the latest submission for a given participant, or null. */
function getLatestSubmission(
  participantId: string,
  submissions: EndingSubmission[],
): EndingSubmission | null {
  const forParticipant = submissions
    .filter((s) => s.participantId === participantId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return forParticipant[0] ?? null;
}

function StatusBadge({ status }: { status: 'not_submitted' | 'pending' | 'validated' | 'rejected' }) {
  const config = {
    not_submitted: {
      bg: 'bg-sand-200 dark:bg-sand-700',
      text: 'text-sand-600 dark:text-sand-400',
      label: 'Not submitted',
    },
    pending: {
      bg: 'bg-gold-100 dark:bg-gold-900/40',
      text: 'text-gold-700 dark:text-gold-300',
      label: 'Pending',
    },
    validated: {
      bg: 'bg-felt-100 dark:bg-felt-900/40',
      text: 'text-felt-700 dark:text-felt-300',
      label: 'Validated',
    },
    rejected: {
      bg: 'bg-red-100 dark:bg-red-900/40',
      text: 'text-red-700 dark:text-red-300',
      label: 'Rejected',
    },
  }[status];

  return (
    <View className={`rounded-full px-2 py-0.5 ${config.bg}`}>
      <Text className={`text-[10px] font-semibold ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
}

export function ClosingRoster({ participants, injections, endingSubmissions, users }: Props) {
  return (
    <View className="mx-6 mb-4">
      <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
        Closing Roster
      </Text>

      {/* Header */}
      <View className="flex-row rounded-t-lg border border-b-0 border-sand-200 bg-sand-200/50 px-3 py-2 dark:border-sand-700 dark:bg-sand-800">
        <Text className="flex-1 text-xs font-semibold text-sand-600 dark:text-sand-400">
          Name
        </Text>
        <Text className="w-14 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
          Start
        </Text>
        <Text className="w-14 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
          Rebuys
        </Text>
        <Text className="w-14 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
          Total In
        </Text>
        <Text className="w-14 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
          Ending
        </Text>
        <Text className="w-20 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
          Status
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
        const latest = getLatestSubmission(p.id, endingSubmissions);
        const endingValue = latest ? `$${(latest.endingStackCents / 100).toLocaleString()}` : '\u2014';
        const status = latest ? latest.status : 'not_submitted';
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
            <Text className="w-14 text-center text-xs text-sand-600 dark:text-sand-300">
              ${(p.startingStackCents / 100).toLocaleString()}
            </Text>
            <Text className="w-14 text-center text-xs text-sand-600 dark:text-sand-300">
              {approvedRebuys > 0
                ? `$${(approvedRebuys / 100).toLocaleString()}`
                : '-'}
            </Text>
            <Text className="w-14 text-center text-xs text-sand-600 dark:text-sand-300">
              ${(totalIn / 100).toLocaleString()}
            </Text>
            <Text className="w-14 text-center text-xs font-medium text-sand-950 dark:text-sand-50">
              {endingValue}
            </Text>
            <View className="w-20 items-center">
              <StatusBadge status={status} />
            </View>
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
