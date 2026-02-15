import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { EndingSubmission, Season, SeasonMember, Session, SessionInjection, SessionParticipant, User } from '@/types';
import type { ParticipantSessionResult, SessionBalanceCheck } from '@/types/derived';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';

type Props = {
  session: Session;
  season: Season;
  members: SeasonMember[];
  participants: SessionParticipant[];
  injections: SessionInjection[];
  endingSubmissions: EndingSubmission[];
  users: User[];
};

/** Get the latest validated submission for a participant. */
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

/** Compute per-participant PnL and session balance check. */
function computeBalanceCheck(
  sessionId: string,
  participants: SessionParticipant[],
  injections: SessionInjection[],
  endingSubmissions: EndingSubmission[],
  users: User[],
): SessionBalanceCheck {
  const results: ParticipantSessionResult[] = participants.map((p) => {
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

  const sumPnlCents = results.reduce((sum, r) => sum + r.sessionPnlCents, 0);

  return {
    sessionId,
    participants: results,
    sumPnlCents,
    isBalanced: sumPnlCents === 0,
  };
}

export function SessionFinalize({
  session,
  season,
  members,
  participants,
  injections,
  endingSubmissions,
  users,
}: Props) {
  const auth = useAuth();
  const appState = useAppState();
  const [overrideNote, setOverrideNote] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [showOverride, setShowOverride] = useState(false);

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canManage = isTreasurer || isAdmin;

  const host = users.find((u) => u.id === session.hostUserId);

  // Check all participants have validated submissions
  const allValidated = useMemo(() => {
    return participants.every((p) => {
      const submission = getValidatedSubmission(p.id, endingSubmissions);
      return submission !== null;
    });
  }, [participants, endingSubmissions]);

  // Compute balance check
  const balanceCheck = useMemo(
    () => computeBalanceCheck(session.id, participants, injections, endingSubmissions, users),
    [session.id, participants, injections, endingSubmissions, users],
  );

  const canFinalize = allValidated && (balanceCheck.isBalanced || (showOverride && overrideNote.trim().length > 0));

  const handleFinalize = useCallback(async () => {
    if (!canFinalize) return;
    setFinalizing(true);
    try {
      await appState.finalizeSession(
        balanceCheck.isBalanced ? undefined : overrideNote.trim(),
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to finalize session');
    } finally {
      setFinalizing(false);
    }
  }, [appState, balanceCheck.isBalanced, overrideNote, canFinalize]);

  const formatMxn = (cents: number) => `$${(cents / 100).toLocaleString()}`;

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="pb-8"
    >
      {/* Banner */}
      <View className="bg-amber-600 px-6 pb-5 pt-16 dark:bg-amber-800">
        <Text className="text-xl font-bold text-white">Balance Check</Text>
        {host && (
          <Text className="mt-1 text-sm text-amber-100">
            Host: {host.displayName}
            {session.location ? ` \u2022 ${session.location}` : ''}
          </Text>
        )}
      </View>

      <View className="mt-4 px-6">
        {/* Balance indicator */}
        <View
          className={`mb-4 rounded-xl border p-4 ${
            !allValidated
              ? 'border-sand-300 bg-sand-100 dark:border-sand-700 dark:bg-sand-800'
              : balanceCheck.isBalanced
                ? 'border-felt-300 bg-felt-50 dark:border-felt-700 dark:bg-felt-900/30'
                : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30'
          }`}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-sand-950 dark:text-sand-50">
              Sum of PnL
            </Text>
            <Text
              className={`text-lg font-bold ${
                !allValidated
                  ? 'text-sand-500 dark:text-sand-400'
                  : balanceCheck.isBalanced
                    ? 'text-felt-600 dark:text-felt-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {allValidated
                ? `${formatMxn(balanceCheck.sumPnlCents)} MXN`
                : 'Awaiting submissions'}
            </Text>
          </View>
          {allValidated && balanceCheck.isBalanced && (
            <Text className="mt-1 text-sm text-felt-600 dark:text-felt-400">
              Session is balanced. Ready to finalize.
            </Text>
          )}
          {allValidated && !balanceCheck.isBalanced && (
            <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
              Session is NOT balanced. Override with resolution note required.
            </Text>
          )}
          {!allValidated && (
            <Text className="mt-1 text-sm text-sand-500 dark:text-sand-400">
              All submissions must be validated before finalizing.
            </Text>
          )}
        </View>

        {/* PnL Table */}
        <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
          Participant PnL
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
        {balanceCheck.participants.map((result, i) => {
          const isLast = i === balanceCheck.participants.length - 1;
          const pnlColor =
            result.sessionPnlCents > 0
              ? 'text-felt-600 dark:text-felt-400'
              : result.sessionPnlCents < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-sand-600 dark:text-sand-300';

          return (
            <View
              key={result.participantId}
              className={`flex-row items-center border border-t-0 border-sand-200 bg-sand-50 px-3 py-3 dark:border-sand-700 dark:bg-sand-800/50 ${
                isLast ? 'rounded-b-lg' : ''
              }`}
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
            </View>
          );
        })}

        {/* Totals row */}
        <View className="mt-2 flex-row items-center rounded-lg border border-sand-200 bg-sand-100 px-3 py-2.5 dark:border-sand-700 dark:bg-sand-800">
          <Text className="flex-1 text-sm font-bold text-sand-950 dark:text-sand-50">
            Total
          </Text>
          <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-300">
            {formatMxn(balanceCheck.participants.reduce((s, r) => s + r.startingStackCents, 0))}
          </Text>
          <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-300">
            {formatMxn(balanceCheck.participants.reduce((s, r) => s + r.approvedInjectionsTotalCents, 0))}
          </Text>
          <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-300">
            {formatMxn(balanceCheck.participants.reduce((s, r) => s + r.endingStackCents, 0))}
          </Text>
          <Text
            className={`w-16 text-center text-xs font-bold ${
              balanceCheck.sumPnlCents === 0
                ? 'text-felt-600 dark:text-felt-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {balanceCheck.sumPnlCents >= 0 ? '+' : ''}
            {formatMxn(balanceCheck.sumPnlCents)}
          </Text>
        </View>

        {/* Override note (when not balanced) */}
        {allValidated && !balanceCheck.isBalanced && canManage && (
          <View className="mt-6">
            {!showOverride ? (
              <Pressable
                className="items-center rounded-lg border border-red-300 py-3 active:bg-red-50 dark:border-red-700 dark:active:bg-red-900/30"
                onPress={() => setShowOverride(true)}
              >
                <Text className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Override Balance Check
                </Text>
              </Pressable>
            ) : (
              <View className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/30">
                <Text className="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">
                  Resolution Note (required)
                </Text>
                <Text className="mb-3 text-xs text-red-600/80 dark:text-red-400/80">
                  Explain why the session does not balance and how the mismatch was resolved.
                </Text>
                <TextInput
                  className="mb-3 rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm text-sand-950 dark:border-red-800 dark:bg-sand-800 dark:text-sand-50"
                  placeholder="e.g., $50 MXN counting error, split evenly..."
                  placeholderTextColor="#94a3b8"
                  value={overrideNote}
                  onChangeText={setOverrideNote}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <Pressable
                  className="items-center rounded-lg border border-sand-300 py-2 active:bg-sand-100 dark:border-sand-600"
                  onPress={() => {
                    setShowOverride(false);
                    setOverrideNote('');
                  }}
                >
                  <Text className="text-sm text-sand-600 dark:text-sand-400">Cancel Override</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Finalize button (treasurer/admin) */}
        {canManage && (
          <Pressable
            className={`mt-6 items-center rounded-lg py-3.5 ${
              canFinalize && !finalizing
                ? 'bg-gold-500 active:bg-gold-600'
                : 'bg-sand-300 dark:bg-sand-700'
            }`}
            onPress={handleFinalize}
            disabled={!canFinalize || finalizing}
          >
            {finalizing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`text-base font-semibold ${
                  canFinalize ? 'text-white' : 'text-sand-500 dark:text-sand-400'
                }`}
              >
                Finalize Session
              </Text>
            )}
          </Pressable>
        )}

        {!canManage && (
          <Text className="mt-6 text-center text-sm text-sand-500 dark:text-sand-400">
            Only the treasurer or admin can finalize the session.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
