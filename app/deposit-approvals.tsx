import { AppTextInput } from '@/components/ui/app-text-input';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { ErrorView } from '@/components/ui/error-boundary';
import { Loader } from '@/components/ui/loader';
import { MediaImage } from '@/components/ui/media-image';
import { MemberRow } from '@/components/ui/member-row';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/services/api/client';
import type { ApprovalStatus, SeasonDepositSubmission } from '@/types';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
type FilterTab = 'all' | ApprovalStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'approved', label: 'Aprobados' },
  { key: 'rejected', label: 'Rechazados' },
  { key: 'not_submitted', label: 'Sin enviar' },
];

export default function DepositApprovalsScreen() {
  const auth = useAuth();
  const appState = useAppState();
  const router = useRouter();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [submissions, setSubmissions] = useState<SeasonDepositSubmission[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    submissionId: string;
    action: 'approve' | 'reject';
  } | null>(null);
  const [acting, setActing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const season = appState.status === 'season_setup' ? appState.season : null;
  const members = appState.status === 'season_setup' ? appState.members : [];
  const users = appState.status === 'season_setup' ? appState.users : [];
  const isTreasurer = currentUser?.id === season?.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;

  const loadSubmissions = useCallback(async () => {
    if (!season) return;
    try {
      setError(null);
      const res = await api.getDepositSubmissions(season.id);
      setSubmissions(res.submissions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los depósitos');
    } finally {
      setLoading(false);
    }
  }, [season]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const [toast, setToast] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado')), 2000),
      );
      await Promise.race([
        Promise.all([loadSubmissions(), appState.refresh()]),
        timeout,
      ]);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Error al actualizar');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setRefreshing(false);
    }
  }, [loadSubmissions, appState]);

  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.displayName ?? 'Unknown';

  const getLatestSubmission = (userId: string) =>
    submissions
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

  // Derive effective approval status per member from latest submission
  const getEffectiveStatus = (member: (typeof members)[number]): ApprovalStatus => {
    const sub = getLatestSubmission(member.userId);
    if (!sub) return member.approvalStatus;
    if (sub.status === 'approved') return 'approved';
    if (sub.status === 'rejected') return 'rejected';
    return 'pending';
  };

  const filteredMembers = members.filter((m) => filter === 'all' || getEffectiveStatus(m) === filter);

  const handleApprovePress = (submissionId: string) => {
    setPendingAction({ submissionId, action: 'approve' });
  };

  const handleRejectPress = (submissionId: string) => {
    if (!rejectNote.trim()) {
      setToast('Agrega una nota explicando el rechazo');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setPendingAction({ submissionId, action: 'reject' });
  };

  const handleConfirmAction = useCallback(async () => {
    if (!pendingAction) return;
    setActing(true);
    try {
      await api.reviewDeposit({
        submissionId: pendingAction.submissionId,
        action: pendingAction.action,
        reviewNote: pendingAction.action === 'reject' ? rejectNote.trim() : undefined,
      });
      setRejectNote('');
      setExpandedUserId(null);
      setPendingAction(null);
      await loadSubmissions();
      await appState.refresh();
    } catch (e) {
      setPendingAction(null);
      setToast(e instanceof Error ? e.message : 'Revisión fallida');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setActing(false);
    }
  }, [pendingAction, rejectNote, loadSubmissions, appState]);

  if (!isTreasurer && !isAdmin) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
        <Text className="mb-2 text-xl font-heading text-sand-950 dark:text-sand-50">
          Sin Autorización
        </Text>
        <Text className="mb-6 text-center text-sm text-sand-500 dark:text-sand-400">
          Solo el tesorero puede revisar envíos de depósito.
        </Text>
        <Pressable
          className="rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
          onPress={() => router.back()}
        >
          <Text className="text-base font-semibold text-white">Regresar</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
       <Loader size={80} />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={() => {
          setLoading(true);
          loadSubmissions();
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-sand-50 dark:bg-sand-900">
      {toast && (
        <View className="absolute top-2 left-4 right-4 z-50 items-center rounded-lg bg-red-600 px-4 py-2.5">
          <Text className="text-sm font-semibold text-white">{toast}</Text>
        </View>
      )}
      {/* Filter tabs — fixed height row, does not expand */}
      <View className="flex-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-row flex-nowrap items-center gap-2 px-4 py-3"
        >
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.key;
          const count =
            tab.key === 'all'
              ? members.length
              : members.filter((m) => getEffectiveStatus(m) === tab.key).length;
          return (
            <Pressable
              key={tab.key}
              className={`flex-none rounded-full px-4 py-2 ${
                isActive
                  ? 'bg-gold-500'
                  : 'bg-sand-200 dark:bg-sand-700'
              }`}
              onPress={() => setFilter(tab.key)}
            >
              <Text
                className={`text-sm font-medium ${
                  isActive ? 'text-white' : 'text-sand-700 dark:text-sand-300'
                }`}
              >
                {tab.label} ({count})
              </Text>
            </Pressable>
          );
        })}
        </ScrollView>
      </View>

      {/* Member list */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#c49a3c" />}
      >
        {filteredMembers.length === 0 && (
          <Text className="mt-8 text-center text-sm text-sand-500 dark:text-sand-400">
            No hay miembros en esta categoría.
          </Text>
        )}

        {filteredMembers.map((member) => {
          const isExpanded = expandedUserId === member.userId;
          const submission = getLatestSubmission(member.userId);
          // Derive display status from latest submission (more accurate than member.approvalStatus)
          const displayStatus: ApprovalStatus = submission
            ? (submission.status === 'approved' ? 'approved' : submission.status === 'rejected' ? 'rejected' : 'pending')
            : member.approvalStatus;

          return (
            <View
              key={member.id}
              className="mb-3 overflow-hidden rounded-xl border border-sand-200 bg-sand-100 dark:border-sand-700 dark:bg-sand-800"
            >
              <View className="px-4">
                <MemberRow
                  name={getUserName(member.userId)}
                  right={<StatusBadge variant={displayStatus} />}
                  onPress={() => setExpandedUserId(isExpanded ? null : member.userId)}
                />
              </View>

              {isExpanded && (
                <View className="border-t border-sand-200 px-4 py-3 dark:border-sand-700">
                  {submission ? (
                    <>
                      {submission.mediaKey && (
                        <View className="mb-3">
                          <MediaImage
                            mediaKey={submission.mediaKey}
                            variant="pressable"
                            height={180}
                            className="overflow-hidden rounded-lg border border-sand-200 dark:border-sand-700"
                          />
                        </View>
                      )}
                      {submission.note && (
                        <Text className="mb-3 text-sm text-sand-500 dark:text-sand-400">
                          Nota: {submission.note}
                        </Text>
                      )}

                      {displayStatus === 'pending' && (
                        <View>
                          <View className="mb-3 flex-row gap-3">
                            <Pressable
                              className="flex-1 items-center rounded-lg bg-felt-600 py-2.5 active:bg-felt-700"
                              onPress={() => handleApprovePress(submission.id)}
                              disabled={acting}
                            >
                              <Text className="text-sm font-semibold text-white">Aprobar</Text>
                            </Pressable>
                            <Pressable
                              className="flex-1 items-center rounded-lg bg-red-500 py-2.5 active:bg-red-600"
                              onPress={() => handleRejectPress(submission.id)}
                              disabled={acting}
                            >
                              <Text className="text-sm font-semibold text-white">Rechazar</Text>
                            </Pressable>
                          </View>
                          <AppTextInput
                            size="sm"
                            placeholder="Nota de rechazo (requerida para rechazar)"
                            placeholderTextColor="#b5ac9e"
                            value={rejectNote}
                            onChangeText={setRejectNote}
                          />
                        </View>
                      )}

                      {submission.reviewNote && (
                        <Text className="mt-2 text-xs text-sand-500 dark:text-sand-400">
                          Nota de revisión: {submission.reviewNote}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text className="text-sm text-sand-500 dark:text-sand-400">
                      Aún no se ha enviado comprobante de depósito.
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <ConfirmationModal
        visible={pendingAction !== null}
        title={pendingAction?.action === 'approve' ? 'Aprobar Depósito' : 'Rechazar Depósito'}
        message={
          pendingAction?.action === 'approve'
            ? '¿Confirmar la aprobación de este depósito?'
            : '¿Confirmar el rechazo de este depósito?'
        }
        confirmLabel={pendingAction?.action === 'approve' ? 'Aprobar' : 'Rechazar'}
        variant={pendingAction?.action === 'reject' ? 'destructive' : 'default'}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
        loading={acting}
      />
    </View>
  );
}
