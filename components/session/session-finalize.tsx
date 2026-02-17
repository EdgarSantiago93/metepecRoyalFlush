import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Loader } from '@/components/ui/loader';
import type { EndingSubmission, Season, SeasonMember, Session, SessionInjection, SessionParticipant, User } from '@/types';
import type { ParticipantSessionResult, SessionBalanceCheck } from '@/types/derived';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import { IconChartBar, IconScale } from '@tabler/icons-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779';

  const inset = useSafeAreaInsets();
  const paddingTop = inset.top + 10;

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
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo finalizar el juego');
    } finally {
      setFinalizing(false);
    }
  }, [appState, balanceCheck.isBalanced, overrideNote, canFinalize]);

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
          Verificación de Balance
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-gold-100 px-3 py-1 dark:bg-gold-900">
            <Text className="text-xs font-semibold text-gold-700 dark:text-gold-300">
              Verificación
            </Text>
          </View>
          {host && (
            <Text className="text-sm text-sand-500 dark:text-sand-400">
              Host: {host.displayName}
            </Text>
          )}
        </View>
      </View>

      {/* Balance Hero — full-bleed strip */}
      <View
        className={`px-6 py-8 ${
          !allValidated
            ? 'bg-sand-100 dark:bg-sand-800'
            : balanceCheck.isBalanced
              ? 'bg-felt-50 dark:bg-felt-900/20'
              : 'bg-red-50 dark:bg-red-900/20'
        }`}
      >
        <SectionTitle icon={<IconScale size={18} color={iconColor} />} label="Suma de PnL" />
        <Text
          className={`text-3xl font-bold ${
            !allValidated
              ? 'text-sand-500 dark:text-sand-400'
              : balanceCheck.isBalanced
                ? 'text-felt-600 dark:text-felt-400'
                : 'text-red-600 dark:text-red-400'
          }`}
        >
          {allValidated
            ? `${formatMxn(balanceCheck.sumPnlCents)} MXN`
            : 'Esperando envíos'}
        </Text>
        {allValidated && balanceCheck.isBalanced && (
          <Text className="mt-1 text-sm text-felt-600 dark:text-felt-400">
            El juego está balanceado. Listo para finalizar.
          </Text>
        )}
        {allValidated && !balanceCheck.isBalanced && (
          <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
            El juego NO está balanceado. Se requiere anulación con nota de resolución.
          </Text>
        )}
        {!allValidated && (
          <Text className="mt-1 text-sm text-sand-500 dark:text-sand-400">
            Todos los envíos deben ser validados antes de finalizar.
          </Text>
        )}
      </View>

      {/* PnL Table */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <SectionTitle icon={<IconChartBar size={18} color={iconColor} />} label="PnL por Participante" />

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
      </View>

      {/* Override note (when not balanced) */}
      {allValidated && !balanceCheck.isBalanced && canManage && (
        <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
          {!showOverride ? (
            <Pressable
              className="items-center rounded-full border border-red-300 py-3 active:bg-red-50 dark:border-red-700 dark:active:bg-red-900/30"
              onPress={() => setShowOverride(true)}
            >
              <Text className="text-sm font-semibold text-red-600 dark:text-red-400">
                Anular Verificación de Balance
              </Text>
            </Pressable>
          ) : (
            <View className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/30">
              <Text className="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">
                Nota de Resolución (requerida)
              </Text>
              <Text className="mb-3 text-xs text-red-600/80 dark:text-red-400/80">
                Explica por qué el juego no está balanceado y cómo se resolvió la diferencia.
              </Text>
              <AppTextInput
                size="sm"
                className="mb-3 border-red-200 dark:border-red-800"
                placeholder="ej. Error de conteo de $50 MXN, dividido equitativamente..."
                value={overrideNote}
                onChangeText={setOverrideNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Pressable
                className="items-center rounded-full border border-sand-300 py-2 active:bg-sand-100 dark:border-sand-600"
                onPress={() => {
                  setShowOverride(false);
                  setOverrideNote('');
                }}
              >
                <Text className="text-sm text-sand-600 dark:text-sand-400">Cancelar Anulación</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Finalize button (treasurer/admin) */}
      {canManage && (
        <View className="px-6 pt-8">
          <Pressable
            className={`items-center rounded-full py-3.5 ${
              canFinalize && !finalizing
                ? 'bg-gold-500 active:bg-gold-600'
                : 'bg-sand-300 dark:bg-sand-700'
            }`}
            onPress={handleFinalize}
            disabled={!canFinalize || finalizing}
          >
            {finalizing ? (
              <Loader size={40} />
            ) : (
              <Text
                className={`text-base font-semibold ${
                  canFinalize ? 'text-white' : 'text-sand-500 dark:text-sand-400'
                }`}
              >
                Finalizar Juego
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {!canManage && (
        <View className="px-6 pt-8">
          <Text className="text-center text-sm text-sand-500 dark:text-sand-400">
            Solo el tesorero o admin puede finalizar el juego.
          </Text>
        </View>
      )}
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
