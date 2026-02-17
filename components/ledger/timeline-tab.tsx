import { PulsingDot } from '@/components/ui/pulsing-dot';
import { useAppState } from '@/hooks/use-app-state';
import { api } from '@/services/api/client';
import type { SeasonMember, Session, SessionInjection, SessionParticipant, User } from '@/types';
import type { EndingSubmission } from '@/types/models/session';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

// ---------------------------------------------------------------------------
// Timeline event types (historical — finalized sessions)
// ---------------------------------------------------------------------------

type TimelineEvent =
  | { type: 'session_finalized'; sessionId: string; hostName: string; date: string; location: string | null; playerCount: number; timestamp: string }
  | { type: 'buy_in'; playerName: string; amountCents: number; sessionId: string; timestamp: string }
  | { type: 'rebuy'; playerName: string; amountCents: number; sessionId: string; timestamp: string; rebuyType: string }
  | { type: 'pnl_report'; playerName: string; pnlCents: number; sessionId: string; timestamp: string };

// ---------------------------------------------------------------------------
// Live event types (active session)
// ---------------------------------------------------------------------------

type LiveTimelineEvent =
  | { type: 'session_started'; hostName: string; location: string | null; timestamp: string }
  | { type: 'session_closing'; timestamp: string }
  | { type: 'check_in'; playerName: string; timestamp: string }
  | { type: 'confirm_start'; playerName: string; amountCents: number; timestamp: string }
  | { type: 'rebuy_requested'; playerName: string; amountCents: number; rebuyType: string; timestamp: string }
  | { type: 'rebuy_approved'; playerName: string; amountCents: number; rebuyType: string; timestamp: string }
  | { type: 'rebuy_rejected'; playerName: string; rebuyType: string; timestamp: string }
  | { type: 'ending_submitted'; playerName: string; endingStackCents: number; timestamp: string }
  | { type: 'ending_validated'; playerName: string; endingStackCents: number; timestamp: string }
  | { type: 'ending_rejected'; playerName: string; timestamp: string };

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
  onReloadSessions: () => Promise<void>;
  onNavigateToSession: (sessionId: string) => void;
};

export function TimelineTab({ sessions, users, members, session, loading, onReloadSessions, onNavigateToSession }: Props) {
  const appState = useAppState();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [computingEvents, setComputingEvents] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [refreshing, setRefreshing] = useState(false);

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
            rebuyType: inj.type === 'rebuy_500' ? 'Ribeye 🥩 Completo' : inj.type === 'half_250' ? 'Medio Ribeye 🥩' : 'Buy-in de Invitado',
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

  // ---------------------------------------------------------------------------
  // Live session detection + live events
  // ---------------------------------------------------------------------------

  const liveSession = session && session.state !== 'finalized' && session.state !== 'scheduled'
    ? session
    : null;

  const liveEvents = useMemo(() => {
    const p = appState.status === 'season_active' ? appState.participants : [];
    const inj = appState.status === 'season_active' ? appState.injections : [];
    const es = appState.status === 'season_active' ? appState.endingSubmissions : [];
    return buildLiveEvents(liveSession, p, inj, es, users);
  }, [liveSession, appState, users]);

  // ---------------------------------------------------------------------------
  // Pull-to-refresh
  // ---------------------------------------------------------------------------

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const promises: Promise<void>[] = [onReloadSessions()];
      if (appState.status === 'season_active' && appState.session) {
        const s = appState.session.state;
        if (s === 'dealing') promises.push(appState.refreshParticipants());
        else if (s === 'in_progress') promises.push(appState.refreshParticipants(), appState.refreshInjections());
        else if (s === 'closing') promises.push(appState.refreshParticipants(), appState.refreshEndingSubmissions());
      }
      await Promise.all(promises);
    } finally {
      setRefreshing(false);
    }
  }, [onReloadSessions, appState]);

  // ---------------------------------------------------------------------------
  // Pagination + month grouping (historical events only)
  // ---------------------------------------------------------------------------

  const visibleEvents = useMemo(() => events.slice(0, visibleCount), [events, visibleCount]);
  const hasMore = visibleCount < events.length;

  const monthGroups = useMemo(() => {
    const groups: MonthGroup[] = [];
    let currentLabel = '';

    for (const event of visibleEvents) {
      const d = new Date(event.timestamp);
      const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

      if (label !== currentLabel) {
        groups.push({ label, events: [event] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].events.push(event);
      }
    }

    return groups;
  }, [visibleEvents]);

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (loading || computingEvents) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (events.length === 0 && !liveSession) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
         <Image
          source={require('@/assets/images/nodata.png')}
          style={{ width: 200, height: 200, marginBottom: 12 }}
          contentFit="contain"
        />
        <Text className="text-base text-sand-500 dark:text-sand-400">Sin eventos</Text>
        <Text className="mt-1 text-sm text-sand-400 dark:text-sand-500">
          Los eventos aparecerán aquí cuando un juego comience.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Live session section */}
      {liveSession && (
        <LiveSessionSection
          session={liveSession}
          events={liveEvents}
          users={users}
        />
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
            Cargar más eventos
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Build live events from AppState data
// ---------------------------------------------------------------------------

function buildLiveEvents(
  session: Session | null,
  participants: SessionParticipant[],
  injections: SessionInjection[],
  endingSubmissions: EndingSubmission[],
  users: User[],
): LiveTimelineEvent[] {
  if (!session) return [];

  const events: LiveTimelineEvent[] = [];

  // Session started
  if (session.startedAt) {
    const hostName = users.find((u) => u.id === session.hostUserId)?.displayName ?? 'Unknown';
    events.push({
      type: 'session_started',
      hostName,
      location: session.location,
      timestamp: session.startedAt,
    });
  }

  // Session closing
  if (session.endedAt) {
    events.push({
      type: 'session_closing',
      timestamp: session.endedAt,
    });
  }

  // Participant events (skip removed)
  for (const p of participants.filter((p) => !p.removedAt)) {
    const playerName = getUserName(p, users);

    if (p.checkedInAt) {
      events.push({ type: 'check_in', playerName, timestamp: p.checkedInAt });
    }
    if (p.confirmedStartAt) {
      events.push({
        type: 'confirm_start',
        playerName,
        amountCents: p.startingStackCents,
        timestamp: p.confirmedStartAt,
      });
    }
  }

  // Injection events — one event per injection based on current status
  for (const inj of injections) {
    const participant = participants.find((p) => p.id === inj.participantId);
    const playerName = participant ? getUserName(participant, users) : 'Unknown';
    const rebuyType = inj.type === 'rebuy_500' ? ' 1 Ribeye 🥩 ' : inj.type === 'half_250' ? ' 1/2 Ribeye 🥩 ' : 'Buy-in de Invitado';

    if (inj.status === 'pending') {
      events.push({
        type: 'rebuy_requested',
        playerName,
        amountCents: inj.amountCents,
        rebuyType,
        timestamp: inj.requestedAt,
      });
    } else if (inj.status === 'approved') {
      events.push({
        type: 'rebuy_approved',
        playerName,
        amountCents: inj.amountCents,
        rebuyType,
        timestamp: inj.reviewedAt ?? inj.requestedAt,
      });
    } else if (inj.status === 'rejected') {
      events.push({
        type: 'rebuy_rejected',
        playerName,
        rebuyType,
        timestamp: inj.reviewedAt ?? inj.requestedAt,
      });
    }
  }

  // Ending submission events — one event per submission based on current status
  for (const sub of endingSubmissions) {
    const participant = participants.find((p) => p.id === sub.participantId);
    const playerName = participant ? getUserName(participant, users) : 'Unknown';

    if (sub.status === 'pending') {
      events.push({
        type: 'ending_submitted',
        playerName,
        endingStackCents: sub.endingStackCents,
        timestamp: sub.submittedAt,
      });
    } else if (sub.status === 'validated') {
      events.push({
        type: 'ending_validated',
        playerName,
        endingStackCents: sub.endingStackCents,
        timestamp: sub.reviewedAt ?? sub.submittedAt,
      });
    } else if (sub.status === 'rejected') {
      events.push({
        type: 'ending_rejected',
        playerName,
        timestamp: sub.reviewedAt ?? sub.submittedAt,
      });
    }
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events;
}

// ---------------------------------------------------------------------------
// Live session section — header card + live event timeline
// ---------------------------------------------------------------------------

function LiveSessionSection({
  session,
  events,
  users,
}: {
  session: Session;
  events: LiveTimelineEvent[];
  users: User[];
}) {
  const hostName = users.find((u) => u.id === session.hostUserId)?.displayName ?? 'Unknown';
  const stateLabel = session.state === 'dealing' ? 'Repartiendo' : session.state === 'closing' ? 'Cerrando' : 'En Juego';

  return (
    <View className="mx-4 mb-3 overflow-hidden rounded-xl border border-gold-300 bg-gold-50 dark:border-gold-700 dark:bg-gold-900/30">
      {/* Header */}
      <View className="flex-row items-center px-3 py-2.5">
        <PulsingDot />
        <View className="ml-2 flex-1">
          <Text className="text-sm font-bold text-gold-800 dark:text-gold-200">
            Juego en Vivo — {stateLabel}
          </Text>
          <Text className="mt-0.5 text-xs text-gold-600 dark:text-gold-400">
            Host: {hostName}{session.location ? ` \u2022 ${session.location}` : ''}
          </Text>
        </View>
      </View>

      {/* Live event timeline */}
      {events.length > 0 && (
        <View className="border-t border-gold-200/60 dark:border-gold-700/60 pb-4" >
          {events.map((event, i) => {
            const isFirst = i === 0;
            const isLast = i === events.length - 1;

            return (
              <View key={`live-${i}`} className="flex-row pl-2 pr-3">
                {/* Date column */}
                <View style={{ width: 46 }} className="items-end pt-3">
                  <Text className="text-[10px] font-medium text-gold-500 dark:text-gold-500">
                    {formatTime(event.timestamp)}
                  </Text>
                </View>

                {/* Timeline spine */}
                <View style={{ width: 28 }} className="items-center self-stretch">
                  {!isFirst && (
                    <View
                      className="absolute bg-gold-400/30 dark:bg-gold-600/30"
                      style={{ left: 13, top: 0, width: 2, height: NODE_CENTER_Y }}
                    />
                  )}
                  {!isLast && (
                    <View
                      className="absolute bg-gold-400/30 dark:bg-gold-600/30"
                      style={{ left: 13, top: NODE_CENTER_Y, width: 2, bottom: 0 }}
                    />
                  )}
                  <View
                    style={{ marginTop: 12, width: 18, height: 18 }}
                    className="items-center justify-center"
                  >
                    <LiveNodeIndicator type={event.type} />
                  </View>
                </View>

                {/* Content */}
                <View
                  className={`flex-1 py-2.5 ${
                    !isLast ? 'border-b border-gold-200/40 dark:border-gold-700/40' : ''
                  }`}
                >
                  <LiveEventContent event={event} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}


// ---------------------------------------------------------------------------
// Live node indicators
// ---------------------------------------------------------------------------

function LiveNodeIndicator({ type }: { type: LiveTimelineEvent['type'] }) {
  switch (type) {
    case 'session_started':
      // Filled gold circle — session milestone
      return <View className="h-[10px] w-[10px] rounded-full bg-gold-500" />;
    case 'session_closing':
      // Amber circle
      return <View className="h-[10px] w-[10px] rounded-full bg-amber-500" />;
    case 'check_in':
      // Small gold diamond
      return (
        <View
          style={{ width: 8, height: 8, transform: [{ rotate: '45deg' }] }}
          className="bg-gold-500"
        />
      );
    case 'confirm_start':
      // Small felt checkmark circle
      return (
        <View className="h-3.5 w-3.5 items-center justify-center rounded-full bg-felt-500">
          <Text style={{ fontSize: 8, lineHeight: 10 }} className="font-bold text-white">
            {'\u2713'}
          </Text>
        </View>
      );
    case 'rebuy_requested':
      // Dashed border gold circle
      return (
        <View
          className="h-3 w-3 rounded-full border border-gold-500 bg-transparent"
          style={{ borderStyle: 'dashed' }}
        />
      );
    case 'rebuy_approved':
      // Filled gold circle
      return <View className="h-3 w-3 rounded-full bg-gold-500" />;
    case 'rebuy_rejected':
      // Small red circle
      return <View className="h-2.5 w-2.5 rounded-full bg-red-500" />;
    case 'ending_submitted':
      // Open felt circle
      return <View className="h-3 w-3 rounded-full border-2 border-felt-500 bg-transparent" />;
    case 'ending_validated':
      // Felt checkmark circle
      return (
        <View className="h-3.5 w-3.5 items-center justify-center rounded-full bg-felt-500">
          <Text style={{ fontSize: 8, lineHeight: 10 }} className="font-bold text-white">
            {'\u2713'}
          </Text>
        </View>
      );
    case 'ending_rejected':
      // Small red circle
      return <View className="h-2.5 w-2.5 rounded-full bg-red-500" />;
    default:
      return <View className="h-2.5 w-2.5 rounded-full bg-sand-400" />;
  }
}

// ---------------------------------------------------------------------------
// Live event content — right side of the spine
// ---------------------------------------------------------------------------

function LiveEventContent({ event }: { event: LiveTimelineEvent }) {
  const formatMxn = (cents: number) => `$${(Math.abs(cents) / 100).toLocaleString()}`;

  switch (event.type) {
    case 'session_started':
      return (
        <Text className="text-xs font-semibold text-gold-800 dark:text-gold-200">
          Juego iniciado — Host: {event.hostName}
          {event.location ? ` \u2022 ${event.location}` : ''}
        </Text>
      );
    case 'session_closing':
      return (
        <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          Juego cerrando — envíos abiertos
        </Text>
      );
    case 'check_in':
      return (
        <Text className="text-xs text-sand-800 dark:text-sand-200">
          <Text className="font-medium">{event.playerName}</Text> hizo check in
        </Text>
      );
    case 'confirm_start':
      return (
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-xs text-sand-800 dark:text-sand-200">
            <Text className="font-medium">{event.playerName}</Text> confirmó inicio
          </Text>
          <Text className="text-xs font-semibold text-sand-600 dark:text-sand-400">
            {formatMxn(event.amountCents)}
          </Text>
        </View>
      );
    case 'rebuy_requested':
      return (
        // <View className="flex-row items-center justify-between">
        //   <Text className="flex-1 text-xs text-sand-800 dark:text-sand-200">
        //     <Text className="font-medium">{event.playerName}</Text> solicitó rebuy
        //   </Text>
        //   <Text className="text-xs text-gold-600 dark:text-gold-400">
        //     {event.rebuyType} — {formatMxn(event.amountCents)}
        //   </Text>
        // </View>
        <View className="flex-col items-start justify-between">
        <Text className="flex-1 text-xs text-sand-800 dark:text-sand-200">
          <Text className="font-medium">{event.playerName}</Text> solicitó 
          <Text className='font-medium'>
            {event.rebuyType}
            </Text>
            <Text className="text-xs text-gold-600 dark:text-gold-400">
              {formatMxn(event.amountCents)}
            </Text>
          </Text>
        </View>
      );
    case 'rebuy_approved':
      return (
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-xs text-sand-800 dark:text-sand-200">
            <Text className="font-medium">{event.playerName}</Text> ribeye
            
            <Text className='font-medium text-green-600'>
            {' '} aprobado
            </Text>
             
          </Text>
          <Text className="text-xs font-semibold text-gold-600 dark:text-gold-400">
            +{formatMxn(event.amountCents)}
          </Text>
        </View>
      );
    case 'rebuy_rejected':
      return (
        <Text className="text-xs text-sand-800 dark:text-sand-200">
          <Text className="font-medium">{event.playerName}</Text>{' '}
          <Text className="text-red-600 dark:text-red-400">ribeye rechazado</Text>
          {' '}<Text className="text-sand-500">({event.rebuyType})</Text>
        </Text>
      );
    case 'ending_submitted':
      return (
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-xs text-sand-800 dark:text-sand-200">
            <Text className="font-medium">{event.playerName}</Text> envió stack final
          </Text>
          <Text className="text-xs text-sand-600 dark:text-sand-400">
            {formatMxn(event.endingStackCents)}
          </Text>
        </View>
      );
    case 'ending_validated':
      return (
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-xs text-sand-800 dark:text-sand-200">
            <Text className="font-medium">{event.playerName}</Text> stack final validado
          </Text>
          <Text className="text-xs font-semibold text-felt-600 dark:text-felt-400">
            {formatMxn(event.endingStackCents)}
          </Text>
        </View>
      );
    case 'ending_rejected':
      return (
        <Text className="text-xs text-sand-800 dark:text-sand-200">
          <Text className="font-medium">{event.playerName}</Text>{' '}
          <Text className="text-red-600 dark:text-red-400">stack final rechazado</Text>
        </Text>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Node indicators — shape + color encode event type at a glance (historical)
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
// Event content — right side of the spine (historical)
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
              Juego Finalizado
            </Text>
            <Text className="text-[11px] font-medium text-felt-600 dark:text-felt-400">
              Balanceado
            </Text>
          </View>
          <Text className="mt-0.5 text-xs text-sand-500 dark:text-sand-400">
            Host: {event.hostName}
            {event.location ? ` \u2022 ${event.location}` : ''}
          </Text>
          <Text className="mt-0.5 text-[11px] text-sand-400 dark:text-sand-500">
            {event.playerCount} jugadores
          </Text>
        </Pressable>
      );

    case 'buy_in':
      return (
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 text-sm font-medium text-sand-950 dark:text-sand-50">
            {event.playerName} compró buy-in
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
            Resultado del juego
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
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
}
