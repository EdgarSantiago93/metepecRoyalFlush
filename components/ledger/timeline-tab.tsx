import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import type { SeasonMember, Session, SessionInjection, SessionParticipant, User } from '@/types';
import type { EndingSubmission } from '@/types/models/session';
import { api } from '@/services/api/client';

// ---------------------------------------------------------------------------
// Timeline event types
// ---------------------------------------------------------------------------

type TimelineEvent =
  | { type: 'session_finalized'; sessionId: string; hostName: string; date: string; location: string | null; playerCount: number; timestamp: string }
  | { type: 'buy_in'; playerName: string; amountCents: number; sessionId: string; timestamp: string }
  | { type: 'rebuy'; playerName: string; amountCents: number; sessionId: string; timestamp: string; rebuyType: string }
  | { type: 'pnl_report'; playerName: string; pnlCents: number; sessionId: string; timestamp: string }
  | { type: 'session_in_progress'; sessionId: string; hostName: string; startedAt: string; location: string | null; timestamp: string };

const PAGE_SIZE = 20;

type Props = {
  sessions: Session[];
  users: User[];
  members: SeasonMember[];
  session: Session | null;
  loading: boolean;
  onNavigateToSession: (sessionId: string) => void;
};

export function TimelineTab({ sessions, users, members, session, loading, onNavigateToSession }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [computingEvents, setComputingEvents] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const buildEvents = useCallback(async () => {
    setComputingEvents(true);
    try {
      const allEvents: TimelineEvent[] = [];
      const finalizedSessions = sessions.filter((s) => s.state === 'finalized');

      // Fetch details for all finalized sessions
      const details = await Promise.all(
        finalizedSessions.map((s) => api.getSessionDetail(s.id)),
      );

      for (const detail of details) {
        const hostName = users.find((u) => u.id === detail.session.hostUserId)?.displayName ?? 'Unknown';

        // Session finalized event
        allEvents.push({
          type: 'session_finalized',
          sessionId: detail.session.id,
          hostName,
          date: detail.session.finalizedAt ?? detail.session.startedAt ?? detail.session.scheduledAt,
          location: detail.session.location,
          playerCount: detail.participants.length,
          timestamp: detail.session.finalizedAt ?? detail.session.startedAt ?? detail.session.scheduledAt,
        });

        // Buy-in events (each participant checking in)
        for (const p of detail.participants) {
          const playerName = getUserName(p, users);
          allEvents.push({
            type: 'buy_in',
            playerName,
            amountCents: p.startingStackCents,
            sessionId: detail.session.id,
            timestamp: p.checkedInAt ?? p.createdAt,
          });
        }

        // Rebuy events (approved only)
        const approvedRebuys = detail.injections.filter(
          (inj: SessionInjection) => inj.status === 'approved',
        );
        for (const inj of approvedRebuys) {
          const participant = detail.participants.find((p: SessionParticipant) => p.id === inj.participantId);
          const playerName = participant ? getUserName(participant, users) : 'Unknown';
          allEvents.push({
            type: 'rebuy',
            playerName,
            amountCents: inj.amountCents,
            sessionId: detail.session.id,
            rebuyType: inj.type === 'rebuy_500' ? 'Full Rebuy' : inj.type === 'half_250' ? 'Half Rebuy' : 'Guest Buy-in',
            timestamp: inj.reviewedAt ?? inj.requestedAt,
          });
        }

        // PnL report events (per participant)
        for (const p of detail.participants) {
          const playerName = getUserName(p, users);
          const approvedInjections = detail.injections
            .filter((inj: SessionInjection) => inj.participantId === p.id && inj.status === 'approved')
            .reduce((sum: number, inj: SessionInjection) => sum + inj.amountCents, 0);
          const validatedSub = detail.endingSubmissions
            .filter((s: EndingSubmission) => s.participantId === p.id && s.status === 'validated')
            .sort((a: EndingSubmission, b: EndingSubmission) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
          const endingStack = validatedSub?.endingStackCents ?? 0;
          const pnl = endingStack - p.startingStackCents - approvedInjections;

          allEvents.push({
            type: 'pnl_report',
            playerName,
            pnlCents: pnl,
            sessionId: detail.session.id,
            timestamp: detail.session.finalizedAt ?? detail.session.startedAt ?? detail.session.scheduledAt,
          });
        }
      }

      // Sort all events newest first
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(allEvents);
    } finally {
      setComputingEvents(false);
    }
  }, [sessions, users]);

  useEffect(() => {
    if (!loading) {
      buildEvents();
    }
  }, [loading, buildEvents]);

  // Check for in-progress session
  const liveSession = session && session.state !== 'finalized' && session.state !== 'scheduled'
    ? session
    : null;

  const visibleEvents = useMemo(() => events.slice(0, visibleCount), [events, visibleCount]);
  const hasMore = visibleCount < events.length;

  const formatMxn = (cents: number) => `$${(cents / 100).toLocaleString()}`;
  const formatPnl = (cents: number) =>
    `${cents >= 0 ? '+' : ''}$${(cents / 100).toLocaleString()}`;

  if (loading || computingEvents) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: TimelineEvent }) => {
    switch (item.type) {
      case 'session_in_progress':
        return null; // Handled by badge above
      case 'session_finalized':
        return (
          <Pressable
            className="mb-2 rounded-xl border border-sand-200 bg-sand-50 p-3 active:bg-sand-100 dark:border-sand-700 dark:bg-sand-800/50 dark:active:bg-sand-700"
            onPress={() => onNavigateToSession(item.sessionId)}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-full bg-felt-500" />
                  <Text className="text-sm font-semibold text-sand-950 dark:text-sand-50">
                    Session Finalized
                  </Text>
                </View>
                <Text className="mt-1 text-xs text-sand-500 dark:text-sand-400">
                  Host: {item.hostName}
                  {item.location ? ` \u2022 ${item.location}` : ''}
                  {` \u2022 ${item.playerCount} players`}
                </Text>
              </View>
              <Text className="text-xs text-sand-400 dark:text-sand-500">
                {formatDate(item.date)}
              </Text>
            </View>
          </Pressable>
        );
      case 'buy_in':
        return (
          <View className="mb-2 rounded-xl border border-sand-200 bg-sand-50 p-3 dark:border-sand-700 dark:bg-sand-800/50">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-full bg-gold-500" />
                  <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">
                    {item.playerName} bought in
                  </Text>
                </View>
              </View>
              <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                {formatMxn(item.amountCents)}
              </Text>
            </View>
            <Text className="ml-4 mt-0.5 text-xs text-sand-400 dark:text-sand-500">
              {formatDate(item.timestamp)}
            </Text>
          </View>
        );
      case 'rebuy':
        return (
          <View className="mb-2 rounded-xl border border-sand-200 bg-sand-50 p-3 dark:border-sand-700 dark:bg-sand-800/50">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-full bg-gold-400" />
                  <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">
                    {item.playerName} — {item.rebuyType}
                  </Text>
                </View>
              </View>
              <Text className="text-sm font-semibold text-gold-600 dark:text-gold-400">
                +{formatMxn(item.amountCents)}
              </Text>
            </View>
            <Text className="ml-4 mt-0.5 text-xs text-sand-400 dark:text-sand-500">
              {formatDate(item.timestamp)}
            </Text>
          </View>
        );
      case 'pnl_report': {
        const pnlColor =
          item.pnlCents > 0
            ? 'text-felt-600 dark:text-felt-400'
            : item.pnlCents < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-sand-600 dark:text-sand-300';
        return (
          <View className="mb-2 rounded-xl border border-sand-200 bg-sand-50 p-3 dark:border-sand-700 dark:bg-sand-800/50">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <View
                    className={`h-2 w-2 rounded-full ${
                      item.pnlCents >= 0 ? 'bg-felt-500' : 'bg-red-500'
                    }`}
                  />
                  <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">
                    {item.playerName} PnL
                  </Text>
                </View>
              </View>
              <Text className={`text-sm font-bold ${pnlColor}`}>
                {formatPnl(item.pnlCents)}
              </Text>
            </View>
            <Text className="ml-4 mt-0.5 text-xs text-sand-400 dark:text-sand-500">
              {formatDate(item.timestamp)}
            </Text>
          </View>
        );
      }
    }
  };

  return (
    <View className="flex-1 px-6">
      {/* In-progress session badge */}
      {liveSession && (
        <View className="mb-3 flex-row items-center rounded-lg border border-gold-300 bg-gold-50 px-3 py-2.5 dark:border-gold-700 dark:bg-gold-900/30">
          <View className="mr-2 h-2 w-2 rounded-full bg-gold-500" />
          <Text className="flex-1 text-sm font-medium text-gold-800 dark:text-gold-200">
            Session in progress
          </Text>
          <Text className="text-xs text-gold-600 dark:text-gold-400">
            Host: {users.find((u) => u.id === liveSession.hostUserId)?.displayName ?? 'Unknown'}
          </Text>
        </View>
      )}

      {events.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-sand-500 dark:text-sand-400">
            No events yet
          </Text>
          <Text className="mt-1 text-sm text-sand-400 dark:text-sand-500">
            Events will appear here after sessions are finalized.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleEvents}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
          ListFooterComponent={
            hasMore ? (
              <Pressable
                className="mb-4 items-center rounded-lg border border-sand-200 bg-sand-100 py-3 active:bg-sand-200 dark:border-sand-700 dark:bg-sand-800 dark:active:bg-sand-700"
                onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                <Text className="text-sm font-semibold text-gold-600 dark:text-gold-400">
                  Load more events
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUserName(participant: SessionParticipant, users: User[]): string {
  if (participant.userId) {
    const user = users.find((u) => u.id === participant.userId);
    return user?.displayName ?? 'Unknown';
  }
  return participant.guestName ?? 'Guest';
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
