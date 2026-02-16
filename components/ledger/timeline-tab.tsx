import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
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
  | { type: 'pnl_report'; playerName: string; pnlCents: number; sessionId: string; timestamp: string };

type MonthGroup = {
  label: string;
  events: TimelineEvent[];
};

const PAGE_SIZE = 20;
const NODE_CENTER_Y = 22;

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

      const details = await Promise.all(
        finalizedSessions.map((s) => api.getSessionDetail(s.id)),
      );

      for (const detail of details) {
        const hostName = users.find((u) => u.id === detail.session.hostUserId)?.displayName ?? 'Unknown';

        allEvents.push({
          type: 'session_finalized',
          sessionId: detail.session.id,
          hostName,
          date: detail.session.finalizedAt ?? detail.session.startedAt ?? detail.session.scheduledAt,
          location: detail.session.location,
          playerCount: detail.participants.length,
          timestamp: detail.session.finalizedAt ?? detail.session.startedAt ?? detail.session.scheduledAt,
        });

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

  const liveSession = session && session.state !== 'finalized' && session.state !== 'scheduled'
    ? session
    : null;

  const visibleEvents = useMemo(() => events.slice(0, visibleCount), [events, visibleCount]);
  const hasMore = visibleCount < events.length;

  const monthGroups = useMemo(() => {
    const groups: MonthGroup[] = [];
    let currentLabel = '';

    for (const event of visibleEvents) {
      const d = new Date(event.timestamp);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (label !== currentLabel) {
        groups.push({ label, events: [event] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].events.push(event);
      }
    }

    return groups;
  }, [visibleEvents]);

  if (loading || computingEvents) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base text-sand-500 dark:text-sand-400">No events yet</Text>
        <Text className="mt-1 text-sm text-sand-400 dark:text-sand-500">
          Events will appear here after sessions are finalized.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* In-progress session badge */}
      {liveSession && (
        <View className="mx-4 mb-2 flex-row items-center rounded-lg border border-gold-300 bg-gold-50 px-3 py-2.5 dark:border-gold-700 dark:bg-gold-900/30">
          <View className="mr-2 h-2.5 w-2.5 rounded-full bg-gold-500" />
          <Text className="flex-1 text-sm font-medium text-gold-800 dark:text-gold-200">
            Session in progress
          </Text>
          <Text className="text-xs text-gold-600 dark:text-gold-400">
            Host: {users.find((u) => u.id === liveSession.hostUserId)?.displayName ?? 'Unknown'}
          </Text>
        </View>
      )}

      {monthGroups.map((group, gi) => (
        <View key={group.label}>
          {/* Month section header */}
          <View className="border-b border-sand-200 bg-sand-100 px-4 py-2.5 dark:border-sand-700 dark:bg-sand-800/80">
            <Text className="text-sm font-semibold text-sand-600 dark:text-sand-400">
              {group.label}
            </Text>
          </View>

          {/* Events in this month */}
          {group.events.map((event, ei) => {
            const isFirst = ei === 0;
            const isLast = ei === group.events.length - 1;

            return (
              <View key={`${gi}-${ei}`} className="flex-row pl-2 pr-4">
                {/* Date column */}
                <View style={{ width: 52 }} className="items-end pt-3">
                  <Text className="text-[11px] font-medium text-sand-500 dark:text-sand-400">
                    {formatShortDate(event.timestamp)}
                  </Text>
                </View>

                {/* Timeline spine */}
                <View style={{ width: 32 }} className="items-center self-stretch">
                  {/* Top line segment — connects from previous node center to this node center */}
                  {!isFirst && (
                    <View
                      className="absolute bg-gold-400/40 dark:bg-gold-600/40"
                      style={{ left: 15, top: 0, width: 2, height: NODE_CENTER_Y }}
                    />
                  )}
                  {/* Bottom line segment — connects from this node center to bottom of row */}
                  {!isLast && (
                    <View
                      className="absolute bg-gold-400/40 dark:bg-gold-600/40"
                      style={{ left: 15, top: NODE_CENTER_Y, width: 2, bottom: 0 }}
                    />
                  )}
                  {/* Node container — fixed size for consistent alignment */}
                  <View
                    style={{ marginTop: 12, width: 20, height: 20 }}
                    className="items-center justify-center"
                  >
                    <NodeIndicator
                      type={event.type}
                      pnlCents={event.type === 'pnl_report' ? event.pnlCents : 0}
                    />
                  </View>
                </View>

                {/* Content */}
                <View
                  className={`flex-1 py-3 ${
                    !isLast ? 'border-b border-sand-200/60 dark:border-sand-700/60' : ''
                  }`}
                >
                  <EventContent
                    event={event}
                    onNavigateToSession={onNavigateToSession}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ))}

      {/* Load more */}
      {hasMore && (
        <Pressable
          className="mx-4 mt-4 items-center rounded-lg border border-sand-200 bg-sand-100 py-3 active:bg-sand-200 dark:border-sand-700 dark:bg-sand-800 dark:active:bg-sand-700"
          onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          <Text className="text-sm font-semibold text-gold-600 dark:text-gold-400">
            Load more events
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Node indicators — shape + color encode event type at a glance
// ---------------------------------------------------------------------------

function NodeIndicator({ type, pnlCents = 0 }: { type: TimelineEvent['type']; pnlCents?: number }) {
  switch (type) {
    case 'session_finalized':
      // Checkmark circle — completed session milestone
      return (
        <View className="h-5 w-5 items-center justify-center rounded-full bg-felt-500">
          <Text style={{ fontSize: 11, lineHeight: 13 }} className="font-bold text-white">
            {'\u2713'}
          </Text>
        </View>
      );
    case 'buy_in':
      // Filled diamond — money entering the game
      return (
        <View
          style={{ width: 10, height: 10, transform: [{ rotate: '45deg' }] }}
          className="bg-gold-500"
        />
      );
    case 'rebuy':
      // Open circle — additional injection
      return (
        <View className="h-4 w-4 rounded-full border-2 border-gold-500 bg-sand-50 dark:bg-sand-900" />
      );
    case 'pnl_report':
      // Small filled circle — result outcome (green = profit, red = loss)
      return (
        <View
          className={`h-3 w-3 rounded-full ${
            pnlCents > 0 ? 'bg-felt-500' : pnlCents < 0 ? 'bg-red-500' : 'bg-sand-400'
          }`}
        />
      );
    default:
      return <View className="h-3 w-3 rounded-full bg-sand-400" />;
  }
}

// ---------------------------------------------------------------------------
// Event content — right side of the spine
// ---------------------------------------------------------------------------

function EventContent({
  event,
  onNavigateToSession,
}: {
  event: TimelineEvent;
  onNavigateToSession: (sessionId: string) => void;
}) {
  const formatMxn = (cents: number) => `$${(Math.abs(cents) / 100).toLocaleString()}`;

  switch (event.type) {
    case 'session_finalized':
      return (
        <Pressable
          className="active:opacity-70"
          onPress={() => onNavigateToSession(event.sessionId)}
        >
          <View className="flex-row items-start justify-between">
            <Text className="flex-1 text-sm font-bold text-sand-950 dark:text-sand-50">
              Session Finalized
            </Text>
            <Text className="text-[11px] font-medium text-felt-600 dark:text-felt-400">
              Balanced
            </Text>
          </View>
          <Text className="mt-0.5 text-xs text-sand-500 dark:text-sand-400">
            Host: {event.hostName}
            {event.location ? ` \u2022 ${event.location}` : ''}
          </Text>
          <Text className="mt-0.5 text-[11px] text-sand-400 dark:text-sand-500">
            {event.playerCount} players
          </Text>
        </Pressable>
      );

    case 'buy_in':
      return (
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 text-sm font-medium text-sand-950 dark:text-sand-50">
            {event.playerName} bought in
          </Text>
          <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
            {formatMxn(event.amountCents)}
          </Text>
        </View>
      );

    case 'rebuy':
      return (
        <>
          <View className="flex-row items-start justify-between">
            <Text className="flex-1 text-sm font-medium text-sand-950 dark:text-sand-50">
              {event.playerName}
            </Text>
            <Text className="text-sm font-semibold text-gold-600 dark:text-gold-400">
              +{formatMxn(event.amountCents)}
            </Text>
          </View>
          <Text className="mt-0.5 text-xs text-sand-500 dark:text-sand-400">
            {event.rebuyType}
          </Text>
        </>
      );

    case 'pnl_report': {
      const pnlColor =
        event.pnlCents > 0
          ? 'text-felt-600 dark:text-felt-400'
          : event.pnlCents < 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-sand-600 dark:text-sand-300';
      const sign = event.pnlCents >= 0 ? '+' : '-';
      return (
        <>
          <View className="flex-row items-start justify-between">
            <Text className="flex-1 text-sm font-medium text-sand-950 dark:text-sand-50">
              {event.playerName}
            </Text>
            <Text className={`text-sm font-bold ${pnlColor}`}>
              {sign}{formatMxn(event.pnlCents)}
            </Text>
          </View>
          <Text className="mt-0.5 text-xs text-sand-500 dark:text-sand-400">
            Session result
          </Text>
        </>
      );
    }

    default:
      return null;
  }
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

function formatShortDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}
