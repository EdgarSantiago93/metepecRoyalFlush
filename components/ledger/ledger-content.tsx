import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Season, SeasonMember, Session, User } from '@/types';
import { api } from '@/services/api/client';
import { StandingsTab } from './standings-tab';
import { TimelineTab } from './timeline-tab';

type Tab = 'standings' | 'timeline';

type Props = {
  season: Season;
  members: SeasonMember[];
  users: User[];
  session: Session | null;
};

export function LedgerContent({ season, members, users, session }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('standings');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getSeasonSessions(season.id);
      setSessions(res.sessions);
    } finally {
      setLoading(false);
    }
  }, [season.id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const treasurerName = users.find((u) => u.id === season.treasurerUserId)?.displayName ?? 'Unknown';

  return (
    <View className="flex-1 bg-sand-50 dark:bg-sand-900">
      {/* Header */}
      <View className="px-6 pb-3 pt-16">
        <Text className="mb-0.5 text-2xl font-bold text-sand-950 dark:text-sand-50">
          Ledger
        </Text>
        <Text className="text-sm text-sand-500 dark:text-sand-400">
          {season.name ?? 'Current Season'} — Treasurer: {treasurerName}
        </Text>
      </View>

      {/* Tab bar */}
      <View className="mx-6 mb-3 flex-row rounded-lg border border-sand-200 bg-sand-100 p-1 dark:border-sand-700 dark:bg-sand-800">
        <TabButton
          label="Standings"
          isActive={activeTab === 'standings'}
          onPress={() => setActiveTab('standings')}
        />
        <TabButton
          label="Timeline"
          isActive={activeTab === 'timeline'}
          onPress={() => setActiveTab('timeline')}
        />
      </View>

      {/* Tab content */}
      {activeTab === 'standings' ? (
        <StandingsTab
          members={members}
          users={users}
          sessions={sessions}
          session={session}
          loading={loading}
        />
      ) : (
        <TimelineTab
          sessions={sessions}
          users={users}
          members={members}
          session={session}
          loading={loading}
        />
      )}
    </View>
  );
}

function TabButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`flex-1 items-center rounded-md px-3 py-2 ${
        isActive
          ? 'bg-white shadow-sm dark:bg-sand-700'
          : 'bg-transparent'
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-sm font-semibold ${
          isActive
            ? 'text-sand-950 dark:text-sand-50'
            : 'text-sand-500 dark:text-sand-400'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
