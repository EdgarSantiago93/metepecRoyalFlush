import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import type { SeasonMember, User } from '@/types';

export function EndSeasonPayout() {
  const router = useRouter();
  const appState = useAppState();
  const auth = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  if (appState.status !== 'season_active') return null;

  const { members, users } = appState;
  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === appState.season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canEnd = isTreasurer || isAdmin;

  const userMap = new Map<string, User>(users.map((u) => [u.id, u]));

  // Only approved members
  const approvedMembers = members
    .filter((m) => m.approvalStatus === 'approved')
    .sort((a, b) => b.currentBalanceCents - a.currentBalanceCents);

  const totalCents = approvedMembers.reduce((sum, m) => sum + m.currentBalanceCents, 0);

  const handleEndSeason = async () => {
    setLoading(true);
    try {
      await appState.endSeason();
      setShowConfirm(false);
      router.back();
    } catch (e) {
      setLoading(false);
      setShowConfirm(false);
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to end season');
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="px-6 pt-6 pb-8"
    >
      {/* Header */}
      <Text className="mb-1 text-xl font-bold text-sand-950 dark:text-sand-50">
        Payout Report
      </Text>
      <Text className="mb-6 text-sm text-sand-500 dark:text-sand-400">
        Final balances for all approved members. Ending the season is permanent.
      </Text>

      {/* Payout Table */}
      <View className="mb-6 rounded-xl border border-sand-200 bg-sand-100 dark:border-sand-700 dark:bg-sand-800">
        {/* Table Header */}
        <View className="flex-row items-center border-b border-sand-200 px-4 py-3 dark:border-sand-700">
          <Text className="flex-1 text-xs font-semibold uppercase tracking-wide text-sand-500 dark:text-sand-400">
            Player
          </Text>
          <Text className="text-xs font-semibold uppercase tracking-wide text-sand-500 dark:text-sand-400">
            Balance (MXN)
          </Text>
        </View>

        {/* Member Rows */}
        {approvedMembers.map((member, index) => (
          <PayoutRow
            key={member.id}
            member={member}
            user={userMap.get(member.userId)}
            isLast={index === approvedMembers.length - 1}
          />
        ))}

        {/* Total Row */}
        <View className="flex-row items-center border-t border-sand-300 px-4 py-3 dark:border-sand-600">
          <Text className="flex-1 text-sm font-bold text-sand-950 dark:text-sand-50">
            Total
          </Text>
          <Text className="text-sm font-bold text-sand-950 dark:text-sand-50">
            ${(totalCents / 100).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* End Season Button */}
      {canEnd && (
        <Pressable
          className="items-center rounded-lg bg-red-600 py-3 active:bg-red-700"
          onPress={() => setShowConfirm(true)}
        >
          <Text className="text-sm font-semibold text-white">End Season</Text>
        </Pressable>
      )}

      <ConfirmationModal
        visible={showConfirm}
        title="End Season"
        message="This will permanently end the current season. All balances will be finalized and no more sessions can be played. This action cannot be undone."
        confirmLabel="End Season"
        variant="destructive"
        onConfirm={handleEndSeason}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </ScrollView>
  );
}

function PayoutRow({
  member,
  user,
  isLast,
}: {
  member: SeasonMember;
  user: User | undefined;
  isLast: boolean;
}) {
  const balanceMxn = member.currentBalanceCents / 100;

  return (
    <View
      className={`flex-row items-center px-4 py-3 ${
        !isLast ? 'border-b border-sand-200 dark:border-sand-700' : ''
      }`}
    >
      <Text className="flex-1 text-sm text-sand-950 dark:text-sand-50">
        {user?.displayName ?? 'Unknown'}
      </Text>
      <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">
        ${balanceMxn.toLocaleString()}
      </Text>
    </View>
  );
}
