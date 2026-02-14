import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/services/api/client';
import type { Season, SeasonHostOrder, SeasonMember, Session, User } from '@/types';

type Props = {
  season: Season;
  members: SeasonMember[];
  session: Session | null;
  users: User[];
};

export function SeasonActive({ season, members, session, users }: Props) {
  const router = useRouter();
  const auth = useAuth();
  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isTreasurer = currentUser?.id === season.treasurerUserId;
  const isAdmin = currentUser?.isAdmin === true;
  const canManage = isTreasurer || isAdmin;

  const treasurer = users.find((u) => u.id === season.treasurerUserId);
  const approvedCount = members.filter((m) => m.approvalStatus === 'approved').length;
  const currentMember = members.find((m) => m.userId === currentUser?.id);

  const [hostOrder, setHostOrder] = useState<SeasonHostOrder[]>([]);

  useEffect(() => {
    api.getHostOrder(season.id).then((res) => {
      setHostOrder(res.hostOrder.sort((a, b) => a.sortIndex - b.sortIndex));
    });
  }, [season.id]);

  const userMap = new Map(users.map((u) => [u.id, u]));

  return (
    <ScrollView
      className="flex-1 bg-sand-50 dark:bg-sand-900"
      contentContainerClassName="px-6 pt-16 pb-8"
    >
      {/* Header */}
      <Text className="mb-1 text-2xl font-bold text-sand-950 dark:text-sand-50">
        {season.name ?? 'Current Season'}
      </Text>
      <View className="mt-1 mb-6 self-start rounded-full bg-felt-100 px-3 py-1 dark:bg-felt-900">
        <Text className="text-xs font-semibold text-felt-700 dark:text-felt-300">
          Active
        </Text>
      </View>

      {/* Your Balance */}
      {currentMember && (
        <View className="mb-4 rounded-xl border border-gold-200 bg-gold-50 p-5 dark:border-gold-800 dark:bg-gold-900/30">
          <Text className="mb-1 text-sm font-medium text-gold-700 dark:text-gold-300">
            Your Balance
          </Text>
          <Text className="text-3xl font-bold text-gold-800 dark:text-gold-200">
            ${(currentMember.currentBalanceCents / 100).toLocaleString()} MXN
          </Text>
        </View>
      )}

      {/* Summary */}
      <View className="mb-4 rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
        <InfoRow label="Treasurer" value={treasurer?.displayName ?? 'Unknown'} />
        <InfoRow label="Members" value={`${approvedCount} approved`} />
      </View>

      {/* Session Status Card */}
      <View className="mb-4 rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
        <Text className="mb-3 text-sm font-semibold text-sand-700 dark:text-sand-300">
          Session
        </Text>
        {!session && (
          <>
            <Text className="mb-3 text-sm text-sand-500 dark:text-sand-400">
              No session scheduled
            </Text>
            {canManage && (
              <Pressable
                className="items-center rounded-lg bg-gold-500 py-2.5 active:bg-gold-600"
                onPress={() => router.push('/schedule-session' as never)}
              >
                <Text className="text-sm font-semibold text-white">Schedule Session</Text>
              </Pressable>
            )}
          </>
        )}
        {session && (
          <>
            <SessionStatusRow session={session} users={users} />
            <Pressable
              className="mt-3 items-center rounded-lg border border-sand-300 py-2.5 active:bg-sand-200 dark:border-sand-600 dark:active:bg-sand-700"
              onPress={() => {
                /* Switch to Session tab — future: Linking.openURL or Tabs API */
              }}
            >
              <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                View Session
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Host Order Preview */}
      {hostOrder.length > 0 && (
        <View className="mb-4 rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
          <Text className="mb-3 text-sm font-semibold text-sand-700 dark:text-sand-300">
            Host Rotation
          </Text>
          {hostOrder.map((ho, index) => {
            const user = userMap.get(ho.userId);
            if (!user) return null;
            return (
              <View
                key={ho.id}
                className="mb-1.5 flex-row items-center last:mb-0"
              >
                <Text className="mr-3 w-5 text-right text-xs font-medium text-sand-400 dark:text-sand-500">
                  {index + 1}
                </Text>
                <Text className="text-sm text-sand-950 dark:text-sand-50">
                  {user.displayName}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <View className="mt-2 gap-3">
          <Pressable
            className="items-center rounded-lg border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
            onPress={() => router.push('/host-order' as never)}
          >
            <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
              Edit Host Order
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Session status row (inline in the card)
// ---------------------------------------------------------------------------

function SessionStatusRow({ session, users }: { session: Session; users: User[] }) {
  const host = users.find((u) => u.id === session.hostUserId);

  const stateLabel: Record<string, string> = {
    scheduled: 'Scheduled',
    dealing: 'Dealing',
    in_progress: 'In Progress',
    closing: 'Closing',
    finalized: 'Finalized',
  };

  const stateBg: Record<string, string> = {
    scheduled: 'bg-gold-100 dark:bg-gold-900/40',
    dealing: 'bg-felt-100 dark:bg-felt-900/40',
    in_progress: 'bg-felt-100 dark:bg-felt-900/40',
    closing: 'bg-orange-100 dark:bg-orange-900/40',
    finalized: 'bg-sand-200 dark:bg-sand-700',
  };

  const stateText: Record<string, string> = {
    scheduled: 'text-gold-700 dark:text-gold-300',
    dealing: 'text-felt-700 dark:text-felt-300',
    in_progress: 'text-felt-700 dark:text-felt-300',
    closing: 'text-orange-700 dark:text-orange-300',
    finalized: 'text-sand-600 dark:text-sand-400',
  };

  return (
    <View>
      <View className="mb-2 flex-row items-center gap-2">
        <View className={`rounded-full px-2.5 py-0.5 ${stateBg[session.state] ?? ''}`}>
          <Text className={`text-xs font-semibold ${stateText[session.state] ?? ''}`}>
            {stateLabel[session.state] ?? session.state}
          </Text>
        </View>
      </View>
      <InfoRow label="Host" value={host?.displayName ?? 'Unknown'} />
      {session.scheduledFor && <InfoRow label="When" value={session.scheduledFor} />}
      {session.location && <InfoRow label="Location" value={session.location} />}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-1.5 flex-row items-center justify-between last:mb-0">
      <Text className="text-sm text-sand-500 dark:text-sand-400">{label}</Text>
      <Text className="text-sm font-medium text-sand-950 dark:text-sand-50">{value}</Text>
    </View>
  );
}
