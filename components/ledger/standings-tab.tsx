import { PulsingDot } from '@/components/ui/pulsing-dot';
import { api } from '@/services/api/client';
import type { SeasonMember, Session, SessionInjection, User } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

type SortKey = 'name' | 'balance' | 'sessions' | 'rebuys' | 'pnl';
type SortDir = 'asc' | 'desc';

type StandingRow = {
  userId: string;
  displayName: string;
  currentBalanceCents: number;
  sessionsPlayed: number;
  totalRebuys: number;
  totalPnlCents: number;
};

type Props = {
  members: SeasonMember[];
  users: User[];
  sessions: Session[];
  session: Session | null;
  loading: boolean;
  onNavigateToPlayer: (userId: string) => void;
};

export function StandingsTab({ members, users, sessions, session, loading, onNavigateToPlayer }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('balance');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [computingRows, setComputingRows] = useState(true);

  // Compute standings by fetching detail for each finalized session
  const computeStandings = useCallback(async () => {
    setComputingRows(true);
    try {
      const finalizedSessions = sessions.filter((s) => s.state === 'finalized');

      // Fetch details for all finalized sessions
      const details = await Promise.all(
        finalizedSessions.map((s) => api.getSessionDetail(s.id)),
      );

      // Build per-member stats
      const statsMap = new Map<string, { sessionsPlayed: number; totalRebuys: number; totalPnlCents: number }>();

      for (const detail of details) {
        for (const p of detail.participants) {
          if (p.type !== 'member' || !p.userId) continue;

          const existing = statsMap.get(p.userId) ?? { sessionsPlayed: 0, totalRebuys: 0, totalPnlCents: 0 };
          existing.sessionsPlayed += 1;

          // Count approved rebuys
          const approvedInjections = detail.injections.filter(
            (inj: SessionInjection) => inj.participantId === p.id && inj.status === 'approved',
          );
          existing.totalRebuys += approvedInjections.length;

          // Compute PnL
          const injectionTotal = approvedInjections.reduce((sum: number, inj: SessionInjection) => sum + inj.amountCents, 0);
          const validatedSub = detail.endingSubmissions
            .filter((s) => s.participantId === p.id && s.status === 'validated')
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
          const endingStack = validatedSub?.endingStackCents ?? 0;
          const pnl = endingStack - p.startingStackCents - injectionTotal;
          existing.totalPnlCents += pnl;

          statsMap.set(p.userId, existing);
        }
      }

      // Build rows from approved members
      const computedRows: StandingRow[] = members
        .filter((m) => m.approvalStatus === 'approved')
        .map((m) => {
          const user = users.find((u) => u.id === m.userId);
          const stats = statsMap.get(m.userId);
          return {
            userId: m.userId,
            displayName: user?.displayName ?? 'Unknown',
            currentBalanceCents: m.currentBalanceCents,
            sessionsPlayed: stats?.sessionsPlayed ?? 0,
            totalRebuys: stats?.totalRebuys ?? 0,
            totalPnlCents: stats?.totalPnlCents ?? 0,
          };
        });

      setRows(computedRows);
    } finally {
      setComputingRows(false);
    }
  }, [sessions, members, users]);

  useEffect(() => {
    if (!loading) {
      computeStandings();
    }
  }, [loading, computeStandings]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.displayName.localeCompare(b.displayName);
          break;
        case 'balance':
          cmp = a.currentBalanceCents - b.currentBalanceCents;
          break;
        case 'sessions':
          cmp = a.sessionsPlayed - b.sessionsPlayed;
          break;
        case 'rebuys':
          cmp = a.totalRebuys - b.totalRebuys;
          break;
        case 'pnl':
          cmp = a.totalPnlCents - b.totalPnlCents;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const formatMxn = (cents: number) => `$${(cents / 100).toLocaleString()}`;
  const formatPnl = (cents: number) =>
    `${cents >= 0 ? '+' : ''}$${(cents / 100).toLocaleString()}`;

  if (loading || computingRows) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Check for in-progress session
  const liveSession = session && session.state !== 'finalized' && session.state !== 'scheduled'
    ? session
    : null;

  return (
    <View className="flex-1">
      {/* In-progress session badge */}
      {liveSession && (
        <View className="mx-6 mb-3 flex-row items-center rounded-lg border border-gold-300 bg-gold-50 px-3 py-2.5 dark:border-gold-700 dark:bg-gold-900/30">
          <View className="mr-2 " >
          <PulsingDot />
          </View>
          <Text className="flex-1 text-sm font-medium text-gold-800 dark:text-gold-200">
            Juego en curso
          </Text>
          <Text className="text-xs text-gold-600 dark:text-gold-400">
            Host: {users.find((u) => u.id === liveSession.hostUserId)?.displayName ?? 'Unknown'}
          </Text>
        </View>
      )}

      {/* Horizontally scrollable table */}
      <ScrollView horizontal showsHorizontalScrollIndicator={true} className="flex-1">
        <View className="min-w-full px-6">
          {/* Table header */}
          <View className="flex-row rounded-t-lg border border-b-0 border-sand-200 bg-sand-200/50 dark:border-sand-700 dark:bg-sand-800">
            <SortableHeader
              label="Jugador"
              sortKey="name"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              width={140}
              align="left"
            />
            <SortableHeader
              label="Balance"
              sortKey="balance"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              width={100}
              align="right"
            />
            <SortableHeader
              label="Juegos"
              sortKey="sessions"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              width={80}
              align="center"
            />
            <SortableHeader
              label="Ribeyes 🥩"
              sortKey="rebuys"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              width={95}
              align="center"
            />
            <SortableHeader
              label="Total PnL"
              sortKey="pnl"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              width={100}
              align="right"
            />
          </View>

          {/* Scrollable rows */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pb-4"
          >
            {sortedRows.map((row, i) => {
              const isLast = i === sortedRows.length - 1;
              const pnlColor =
                row.totalPnlCents > 0
                  ? 'text-felt-600 dark:text-felt-400'
                  : row.totalPnlCents < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-sand-600 dark:text-sand-300';

              return (
                <Pressable
                  key={row.userId}
                  className={`flex-row items-center border border-t-0 border-sand-200 bg-sand-50 active:bg-sand-100 dark:border-sand-700 dark:bg-sand-800/50 dark:active:bg-sand-700 ${
                    isLast ? 'rounded-b-lg' : ''
                  }`}
                  onPress={() => onNavigateToPlayer(row.userId)}
                >
                  <View style={{ width: 140 }} className="px-3 py-3">
                    <Text
                      className="text-sm font-medium text-sand-950 dark:text-sand-50"
                      numberOfLines={1}
                    >
                      {row.displayName}
                    </Text>
                  </View>
                  <View style={{ width: 100 }} className="items-end px-3 py-3">
                    <Text className="text-sm font-bold text-sand-950 dark:text-sand-50">
                      {formatMxn(row.currentBalanceCents)}
                    </Text>
                  </View>
                  <View style={{ width: 80 }} className="items-center px-3 py-3">
                    <Text className="text-sm text-sand-600 dark:text-sand-300">
                      {row.sessionsPlayed}
                    </Text>
                  </View>
                  <View style={{ width: 80 }} className="items-center px-3 py-3">
                    <Text className="text-sm text-sand-600 dark:text-sand-300">
                      {row.totalRebuys}
                    </Text>
                  </View>
                  <View style={{ width: 100 }} className="items-end px-3 py-3">
                    <Text className={`text-sm font-bold ${pnlColor}`}>
                      {formatPnl(row.totalPnlCents)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sortable header
// ---------------------------------------------------------------------------

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  width,
  align,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  width: number;
  align: 'left' | 'center' | 'right';
}) {
  const isActive = currentSort === sortKey;
  const arrow = isActive ? (currentDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
  const alignClass =
    align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';

  return (
    <Pressable
      style={{ width }}
      className={`px-3 py-2.5 ${alignClass}`}
      onPress={() => onSort(sortKey)}
    >
      <Text
        className={`text-xs font-semibold ${
          isActive
            ? 'text-gold-600 dark:text-gold-400'
            : 'text-sand-600 dark:text-sand-400'
        }`}
      >
        {label}{arrow}
      </Text>
    </Pressable>
  );
}
