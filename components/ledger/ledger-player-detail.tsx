import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { SeasonMember, Session, SessionInjection, User } from '@/types';
import type { EndingSubmission } from '@/types/models/session';
import type { GetSessionDetailResponse } from '@/services/api/types';

type SessionRow = {
  sessionId: string;
  hostName: string;
  date: string;
  startingStackCents: number;
  endingStackCents: number;
  rebuysCents: number;
  rebuysCount: number;
  pnlCents: number;
};

type Props = {
  player: User;
  member: SeasonMember;
  sessions: Session[];
  sessionDetails: GetSessionDetailResponse[];
  users: User[];
};

export function LedgerPlayerDetail({ player, member, sessions, sessionDetails, users }: Props) {
  const formatMxn = (cents: number) => `$${(cents / 100).toLocaleString()}`;
  const formatPnl = (cents: number) =>
    `${cents >= 0 ? '+' : ''}$${(cents / 100).toLocaleString()}`;

  // Build per-session rows for this player
  const sessionRows = useMemo(() => {
    const rows: SessionRow[] = [];

    for (const detail of sessionDetails) {
      const participant = detail.participants.find((p) => p.userId === player.id);
      if (!participant) continue;

      const host = users.find((u) => u.id === detail.session.hostUserId);
      const approvedInjections = detail.injections.filter(
        (inj: SessionInjection) => inj.participantId === participant.id && inj.status === 'approved',
      );
      const rebuysCents = approvedInjections.reduce((sum: number, inj: SessionInjection) => sum + inj.amountCents, 0);
      const rebuysCount = approvedInjections.length;

      const validatedSub = detail.endingSubmissions
        .filter((s: EndingSubmission) => s.participantId === participant.id && s.status === 'validated')
        .sort((a: EndingSubmission, b: EndingSubmission) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
      const endingStackCents = validatedSub?.endingStackCents ?? 0;
      const pnlCents = endingStackCents - participant.startingStackCents - rebuysCents;

      rows.push({
        sessionId: detail.session.id,
        hostName: host?.displayName ?? 'Unknown',
        date: detail.session.scheduledFor ?? detail.session.startedAt ?? detail.session.scheduledAt,
        startingStackCents: participant.startingStackCents,
        endingStackCents,
        rebuysCents,
        rebuysCount,
        pnlCents,
      });
    }

    // Sort by date (oldest first for chronological view)
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return rows;
  }, [sessionDetails, player.id, users]);

  const totalPnl = sessionRows.reduce((sum, r) => sum + r.pnlCents, 0);
  const totalRebuys = sessionRows.reduce((sum, r) => sum + r.rebuysCount, 0);
  const totalRebuysCents = sessionRows.reduce((sum, r) => sum + r.rebuysCents, 0);
  const sessionsPlayed = sessionRows.length;

  const balanceColor =
    member.currentBalanceCents > 50000
      ? 'text-felt-600 dark:text-felt-400'
      : member.currentBalanceCents < 50000
        ? 'text-red-600 dark:text-red-400'
        : 'text-sand-950 dark:text-sand-50';

  const totalPnlColor =
    totalPnl > 0
      ? 'text-felt-600 dark:text-felt-400'
      : totalPnl < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-sand-950 dark:text-sand-50';

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="pb-8"
    >
      {/* Player header */}
      <View className="bg-sand-100 px-6 pb-5 pt-4 dark:bg-sand-800">
        <Text className="text-xl font-bold text-sand-950 dark:text-sand-50">
          {player.displayName}
        </Text>
        <Text className="mt-1 text-sm text-sand-500 dark:text-sand-400">
          {player.email}
        </Text>
      </View>

      <View className="mt-4 px-6">
        {/* Stats cards */}
        <View className="mb-4 flex-row gap-3">
          <StatCard label="Balance Actual" value={formatMxn(member.currentBalanceCents)} valueClass={balanceColor} />
          <StatCard label="PnL Total" value={formatPnl(totalPnl)} valueClass={totalPnlColor} />
        </View>
        <View className="mb-6 flex-row gap-3">
          <StatCard label="Juegos Jugados" value={String(sessionsPlayed)} />
          <StatCard label="Ribeyes 🥩 Totales" value={`${totalRebuys} (${formatMxn(totalRebuysCents)})`} />
        </View>

        {/* Session history table */}
        <Text className="mb-3 text-base font-semibold text-sand-950 dark:text-sand-50">
          Historial de Juegos
        </Text>

        {sessionRows.length === 0 ? (
          <View className="rounded-xl border border-sand-200 bg-sand-100 p-6 dark:border-sand-700 dark:bg-sand-800">
            <Text className="text-center text-sm text-sand-500 dark:text-sand-400">
              Sin juegos finalizados
            </Text>
          </View>
        ) : (
          <>
            {/* Table header */}
            <View className="flex-row rounded-t-lg border border-b-0 border-sand-200 bg-sand-200/50 px-3 py-2 dark:border-sand-700 dark:bg-sand-800">
              <Text className="flex-1 text-xs font-semibold text-sand-600 dark:text-sand-400">
                Juego
              </Text>
              <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
                Inicio
              </Text>
              <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
                Final
              </Text>
              <Text className="w-14 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
                Ribeyes 🥩
              </Text>
              <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
                PnL
              </Text>
            </View>

            {/* Table rows */}
            {sessionRows.map((row, i) => {
              const isLast = i === sessionRows.length - 1;
              const pnlColor =
                row.pnlCents > 0
                  ? 'text-felt-600 dark:text-felt-400'
                  : row.pnlCents < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-sand-600 dark:text-sand-300';

              return (
                <Pressable
                  key={row.sessionId}
                  className={`flex-row items-center border border-t-0 border-sand-200 bg-sand-50 px-3 py-3 active:bg-sand-100 dark:border-sand-700 dark:bg-sand-800/50 dark:active:bg-sand-700 ${
                    isLast ? 'rounded-b-lg' : ''
                  }`}
                  onPress={() =>
                    router.push({
                      pathname: '/ledger-session-detail',
                      params: { sessionId: row.sessionId },
                    })
                  }
                >
                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium text-sand-950 dark:text-sand-50"
                      numberOfLines={1}
                    >
                      {row.hostName}
                    </Text>
                    <Text className="text-[10px] text-sand-400 dark:text-sand-500">
                      {new Date(row.date).toLocaleDateString('es-MX', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text className="w-16 text-center text-xs text-sand-600 dark:text-sand-300">
                    {formatMxn(row.startingStackCents)}
                  </Text>
                  <Text className="w-16 text-center text-xs text-sand-600 dark:text-sand-300">
                    {formatMxn(row.endingStackCents)}
                  </Text>
                  <Text className="w-14 text-center text-xs text-sand-600 dark:text-sand-300">
                    {row.rebuysCount > 0 ? row.rebuysCount : '-'}
                  </Text>
                  <Text className={`w-16 text-center text-xs font-bold ${pnlColor}`}>
                    {row.pnlCents >= 0 ? '+' : ''}
                    {formatMxn(row.pnlCents)}
                  </Text>
                </Pressable>
              );
            })}
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  valueClass = 'text-sand-950 dark:text-sand-50',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <View className="flex-1 rounded-xl border border-sand-200 bg-sand-100 p-3 dark:border-sand-700 dark:bg-sand-800">
      <Text className="text-xs text-sand-500 dark:text-sand-400">{label}</Text>
      <Text className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</Text>
    </View>
  );
}
