import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { EndingSubmission, Session, SessionFinalizeNote, SessionInjection, SessionParticipant, User } from '@/types';
import type { ParticipantSessionResult } from '@/types/derived';

type Props = {
  session: Session;
  participants: SessionParticipant[];
  injections: SessionInjection[];
  endingSubmissions: EndingSubmission[];
  finalizeNote: SessionFinalizeNote | null;
  users: User[];
};

function getValidatedSubmission(
  participantId: string,
  submissions: EndingSubmission[],
): EndingSubmission | null {
  return (
    submissions
      .filter((s) => s.participantId === participantId && s.status === 'validated')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0] ?? null
  );
}

function computeResults(
  participants: SessionParticipant[],
  injections: SessionInjection[],
  endingSubmissions: EndingSubmission[],
  users: User[],
): ParticipantSessionResult[] {
  return participants.map((p) => {
    const user = users.find((u) => u.id === p.userId);
    const displayName = user?.displayName ?? p.guestName ?? 'Unknown';
    const approvedInjections = injections
      .filter((inj) => inj.participantId === p.id && inj.status === 'approved')
      .reduce((sum, inj) => sum + inj.amountCents, 0);
    const submission = getValidatedSubmission(p.id, endingSubmissions);
    const endingStackCents = submission?.endingStackCents ?? 0;
    const sessionPnlCents = endingStackCents - p.startingStackCents - approvedInjections;
    return {
      participantId: p.id,
      displayName,
      startingStackCents: p.startingStackCents,
      approvedInjectionsTotalCents: approvedInjections,
      endingStackCents,
      sessionPnlCents,
    };
  });
}

export function LedgerSessionDetail({
  session,
  participants,
  injections,
  endingSubmissions,
  finalizeNote,
  users,
}: Props) {
  const router = useRouter();
  const host = users.find((u) => u.id === session.hostUserId);
  const finalizedBy = users.find((u) => u.id === session.finalizedByUserId);

  const results = useMemo(
    () => computeResults(participants, injections, endingSubmissions, users),
    [participants, injections, endingSubmissions, users],
  );

  const sumPnl = results.reduce((s, r) => s + r.sessionPnlCents, 0);
  const isBalanced = sumPnl === 0;

  const approvedRebuys = useMemo(
    () =>
      injections
        .filter((inj) => inj.status === 'approved')
        .sort((a, b) => new Date(a.reviewedAt!).getTime() - new Date(b.reviewedAt!).getTime()),
    [injections],
  );

  const formatMxn = (cents: number) => `$${(cents / 100).toLocaleString()}`;

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="pb-8"
    >
      {/* Banner */}
      <View className="bg-felt-600 px-6 pb-5 pt-4 dark:bg-felt-800">
        <Text className="text-xl font-bold text-white">Session Detail</Text>
        {host && (
          <Text className="mt-1 text-sm text-felt-100">
            Host: {host.displayName}
            {session.location ? ` \u2022 ${session.location}` : ''}
          </Text>
        )}
        <View className="mt-2 self-start rounded-full bg-white/20 px-3 py-1">
          <Text className="text-xs font-semibold text-white">Finalized</Text>
        </View>
      </View>

      <View className="mt-4 px-6">
        {/* Session info card */}
        <View className="mb-4 rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
          {session.scheduledFor && (
            <InfoRow label="Date" value={new Date(session.scheduledFor).toLocaleDateString()} />
          )}
          {session.location && <InfoRow label="Location" value={session.location} />}
          {finalizedBy && <InfoRow label="Finalized by" value={finalizedBy.displayName} />}
          {session.finalizedAt && (
            <InfoRow
              label="Finalized at"
              value={new Date(session.finalizedAt).toLocaleString()}
            />
          )}
          <InfoRow label="Players" value={String(participants.length)} />
        </View>

        {/* PnL Table */}
        <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
          Results
        </Text>

        {/* Table header */}
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
          <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
            Ending
          </Text>
          <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
            PnL
          </Text>
        </View>

        {/* Table rows */}
        {results.map((result, i) => {
          const isLast = i === results.length - 1;
          const participant = participants.find((p) => p.id === result.participantId);
          const pnlColor =
            result.sessionPnlCents > 0
              ? 'text-felt-600 dark:text-felt-400'
              : result.sessionPnlCents < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-sand-600 dark:text-sand-300';

          return (
            <Pressable
              key={result.participantId}
              className={`flex-row items-center border border-t-0 border-sand-200 bg-sand-50 px-3 py-3 active:bg-sand-100 dark:border-sand-700 dark:bg-sand-800/50 dark:active:bg-sand-700 ${
                isLast ? 'rounded-b-lg' : ''
              }`}
              onPress={() => {
                if (participant?.userId) {
                  router.push({
                    pathname: '/ledger-player-detail',
                    params: { userId: participant.userId },
                  });
                }
              }}
              disabled={!participant?.userId}
            >
              <Text
                className="flex-1 text-sm font-medium text-sand-950 dark:text-sand-50"
                numberOfLines={1}
              >
                {result.displayName}
              </Text>
              <Text className="w-16 text-center text-xs text-sand-600 dark:text-sand-300">
                {formatMxn(result.startingStackCents)}
              </Text>
              <Text className="w-16 text-center text-xs text-sand-600 dark:text-sand-300">
                {result.approvedInjectionsTotalCents > 0
                  ? formatMxn(result.approvedInjectionsTotalCents)
                  : '-'}
              </Text>
              <Text className="w-16 text-center text-xs text-sand-600 dark:text-sand-300">
                {formatMxn(result.endingStackCents)}
              </Text>
              <Text className={`w-16 text-center text-xs font-bold ${pnlColor}`}>
                {result.sessionPnlCents >= 0 ? '+' : ''}
                {formatMxn(result.sessionPnlCents)}
              </Text>
            </Pressable>
          );
        })}

        {/* Sum PnL */}
        <View className="mt-2 flex-row items-center rounded-lg border border-sand-200 bg-sand-100 px-3 py-2.5 dark:border-sand-700 dark:bg-sand-800">
          <Text className="flex-1 text-sm font-bold text-sand-950 dark:text-sand-50">
            Total PnL
          </Text>
          <Text
            className={`text-sm font-bold ${
              isBalanced
                ? 'text-felt-600 dark:text-felt-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {sumPnl >= 0 ? '+' : ''}
            {formatMxn(sumPnl)} MXN
          </Text>
        </View>

        {/* Override / resolution note */}
        {finalizeNote && (
          <View className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/30">
            <Text className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-200">
              Resolution Note
            </Text>
            <Text className="text-sm text-amber-700 dark:text-amber-300">
              {finalizeNote.note}
            </Text>
          </View>
        )}

        {/* Rebuy timeline */}
        {approvedRebuys.length > 0 && (
          <View className="mt-6">
            <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
              Rebuys ({approvedRebuys.length})
            </Text>
            {approvedRebuys.map((inj) => {
              const participant = participants.find((p) => p.id === inj.participantId);
              const user = users.find((u) => u.id === participant?.userId);
              const name = user?.displayName ?? participant?.guestName ?? 'Unknown';
              const amount = formatMxn(inj.amountCents);
              const time = new Date(inj.reviewedAt!).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const typeLabel = inj.type === 'rebuy_500' ? 'Full Rebuy' : inj.type === 'half_250' ? 'Half Rebuy' : 'Guest Buy-in';

              return (
                <View
                  key={inj.id}
                  className="mb-2 flex-row items-center justify-between rounded-lg border border-sand-200 bg-sand-50 px-3 py-2.5 dark:border-sand-700 dark:bg-sand-800/50"
                >
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">
                      {name}
                    </Text>
                    <Text className="text-xs text-sand-500 dark:text-sand-400">
                      {typeLabel} {'\u2022'} {time}
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-gold-600 dark:text-gold-400">
                    +{amount}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Ending submissions with photos */}
        <View className="mt-6">
          <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
            Ending Submissions
          </Text>
          {participants.map((p) => {
            const user = users.find((u) => u.id === p.userId);
            const name = user?.displayName ?? p.guestName ?? 'Unknown';
            const submission = getValidatedSubmission(p.id, endingSubmissions);

            return (
              <View
                key={p.id}
                className="mb-2 flex-row items-center justify-between rounded-lg border border-sand-200 bg-sand-50 px-3 py-2.5 dark:border-sand-700 dark:bg-sand-800/50"
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">
                    {name}
                  </Text>
                  <Text className="text-xs text-sand-500 dark:text-sand-400">
                    {submission ? 'Validated' : 'No submission'}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-sand-950 dark:text-sand-50">
                  {submission ? formatMxn(submission.endingStackCents) : '-'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row items-center justify-between last:mb-0">
      <Text className="text-sm text-sand-500 dark:text-sand-400">{label}</Text>
      <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">{value}</Text>
    </View>
  );
}
