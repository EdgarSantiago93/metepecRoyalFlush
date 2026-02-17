import type { EndingSubmission, Season, SeasonMember, Session, SessionFinalizeNote, SessionInjection, SessionParticipant, User } from '@/types';
import type { ParticipantSessionResult } from '@/types/derived';
import { IconChartBar, IconMeat, IconTrophy, IconUsers } from '@tabler/icons-react-native';
import { useMemo } from 'react';
import { ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  session: Session;
  season: Season;
  members: SeasonMember[];
  participants: SessionParticipant[];
  injections: SessionInjection[];
  endingSubmissions: EndingSubmission[];
  finalizeNote: SessionFinalizeNote | null;
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

/** Compute per-participant results. */
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

export function SessionFinalized({
  session,
  season,
  members,
  participants,
  injections,
  endingSubmissions,
  finalizeNote,
  users,
}: Props) {
  const host = users.find((u) => u.id === session.hostUserId);
  const finalizedBy = users.find((u) => u.id === session.finalizedByUserId);

  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779';

  const inset = useSafeAreaInsets();
  const paddingTop = inset.top + 10;

  const results = useMemo(
    () => computeResults(participants, injections, endingSubmissions, users),
    [participants, injections, endingSubmissions, users],
  );

  const sumPnl = results.reduce((s, r) => s + r.sessionPnlCents, 0);
  const isBalanced = sumPnl === 0;

  // Rebuy feed (approved only, chronological)
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
      contentContainerClassName="pb-12"
      style={{ paddingTop }}
    >
      {/* Header */}
      <View className="px-6 pb-6">
        <Text className="mb-2 text-2xl font-heading text-sand-950 dark:text-sand-50">
          Resumen del Juego
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-felt-100 px-3 py-1 dark:bg-felt-900">
            <Text className="text-xs font-semibold text-felt-700 dark:text-felt-300">
              Finalizado
            </Text>
          </View>
          {host && (
            <Text className="text-sm text-sand-500 dark:text-sand-400">
              Host: {host.displayName}
              {session.location ? ` · ${session.location}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Balance Hero — full-bleed strip */}
      <View className={`px-6 py-8 ${isBalanced ? 'bg-felt-50 dark:bg-felt-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
        <Text className={`mb-1 text-sm font-sans-medium ${isBalanced ? 'text-felt-600 dark:text-felt-400' : 'text-red-600 dark:text-red-400'}`}>
          PnL Total
        </Text>
        <Text className={`text-3xl font-bold ${isBalanced ? 'text-felt-800 dark:text-felt-200' : 'text-red-800 dark:text-red-200'}`}>
          {sumPnl >= 0 ? '+' : ''}{formatMxn(sumPnl)} MXN
        </Text>
        <Text className={`mt-1 text-sm ${isBalanced ? 'text-felt-600 dark:text-felt-400' : 'text-red-600 dark:text-red-400'}`}>
          {isBalanced ? 'Juego balanceado' : 'Juego no balanceado'}
        </Text>
      </View>

      {/* Session info */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <SectionTitle icon={<IconTrophy size={18} color={iconColor} />} label="Detalles" />
        {session.scheduledFor && (
          <InfoRow label="Fecha" value={new Date(session.scheduledFor).toLocaleDateString('es-MX')} />
        )}
        {session.location && <InfoRow label="Ubicación" value={session.location} />}
        {finalizedBy && <InfoRow label="Finalizado por" value={finalizedBy.displayName} />}
        {session.finalizedAt && (
          <InfoRow
            label="Finalizado el"
            value={new Date(session.finalizedAt).toLocaleString('es-MX')}
          />
        )}
      </View>

      {/* PnL Table */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <SectionTitle icon={<IconChartBar size={18} color={iconColor} />} label="Resultados" />

        {/* Table header */}
        <View className="flex-row rounded-t-lg border border-b-0 border-sand-200 bg-sand-200/50 px-3 py-2 dark:border-sand-700 dark:bg-sand-800">
          <Text className="flex-1 text-xs font-semibold text-sand-600 dark:text-sand-400">
            Nombre
          </Text>
          <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
            Inicio
          </Text>
          <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
            Ribeyes
          </Text>
          <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
            Final
          </Text>
          <Text className="w-16 text-center text-xs font-semibold text-sand-600 dark:text-sand-400">
            PnL
          </Text>
        </View>

        {/* Table rows */}
        {results.map((result, i) => {
          const isLast = i === results.length - 1;
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
      </View>

      {/* Override / resolution note */}
      {finalizeNote && (
        <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
          <View className="rounded-xl border border-gold-300 bg-gold-50 p-4 dark:border-gold-700 dark:bg-gold-900/30">
            <Text className="mb-1 text-sm font-semibold text-gold-800 dark:text-gold-200">
              Nota de Resolución
            </Text>
            <Text className="text-sm text-gold-700 dark:text-gold-300">
              {finalizeNote.note}
            </Text>
          </View>
        </View>
      )}

      {/* Rebuy timeline */}
      {approvedRebuys.length > 0 && (
        <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
          <SectionTitle icon={<IconMeat size={18} color={iconColor} />} label={`Ribeyes (${approvedRebuys.length})`} />
          {approvedRebuys.map((inj) => {
            const participant = participants.find((p) => p.id === inj.participantId);
            const user = users.find((u) => u.id === participant?.userId);
            const name = user?.displayName ?? participant?.guestName ?? 'Unknown';
            const amount = formatMxn(inj.amountCents);
            const time = new Date(inj.reviewedAt!).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View
                key={inj.id}
                className="mb-2.5 flex-row items-center justify-between last:mb-0"
              >
                <View className="flex-1">
                  <Text className="text-sm font-sans-medium text-sand-950 dark:text-sand-50">
                    {name}
                  </Text>
                  <Text className="text-xs text-sand-500 dark:text-sand-400">{time}</Text>
                </View>
                <Text className="text-sm font-bold text-felt-600 dark:text-felt-400">
                  +{amount}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Updated season balances */}
      <View className="px-6 py-6">
        <SectionTitle icon={<IconUsers size={18} color={iconColor} />} label="Balances de Temporada" />

        {/* Balance table */}
        <View className="flex-row rounded-t-lg border border-b-0 border-sand-200 bg-sand-200/50 px-3 py-2 dark:border-sand-700 dark:bg-sand-800">
          <Text className="flex-1 text-xs font-semibold text-sand-600 dark:text-sand-400">
            Jugador
          </Text>
          <Text className="w-24 text-right text-xs font-semibold text-sand-600 dark:text-sand-400">
            Balance
          </Text>
        </View>

        {members
          .filter((m) => m.approvalStatus === 'approved')
          .sort((a, b) => b.currentBalanceCents - a.currentBalanceCents)
          .map((m, i, arr) => {
            const user = users.find((u) => u.id === m.userId);
            const isParticipant = participants.some((p) => p.userId === m.userId);
            const isLast = i === arr.length - 1;

            return (
              <View
                key={m.id}
                className={`flex-row items-center border border-t-0 border-sand-200 bg-sand-50 px-3 py-2.5 dark:border-sand-700 dark:bg-sand-800/50 ${
                  isLast ? 'rounded-b-lg' : ''
                }`}
              >
                <View className="flex-1 flex-row items-center gap-2">
                  <Text
                    className="text-sm font-medium text-sand-950 dark:text-sand-50"
                    numberOfLines={1}
                  >
                    {user?.displayName ?? 'Unknown'}
                  </Text>
                  {isParticipant && (
                    <View className="rounded-full bg-felt-100 px-1.5 py-0.5 dark:bg-felt-900/40">
                      <Text className="text-[9px] font-semibold text-felt-600 dark:text-felt-400">
                        Jugó
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="w-24 text-right text-sm font-bold text-sand-950 dark:text-sand-50">
                  {formatMxn(m.currentBalanceCents)} MXN
                </Text>
              </View>
            );
          })}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="mb-4 flex-row items-center gap-2">
      {icon}
      <Text className="text-base font-sans-bold text-sand-950 dark:text-sand-50">
        {label}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 flex-row items-center justify-between last:mb-0">
      <Text className="text-sm text-sand-500 dark:text-sand-400">{label}</Text>
      <Text className="text-sm font-sans-semibold text-sand-950 dark:text-sand-50">{value}</Text>
    </View>
  );
}
