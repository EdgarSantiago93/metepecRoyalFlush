import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
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
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
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
          Registro
        </Text>
        <Text className="text-sm text-sand-500 dark:text-sand-400">
          {season.name ?? 'Temporada Actual'} — Tesorero: {treasurerName}
        </Text>
      </View>

      {/* Tab bar */}
      <View className="mx-6 mb-3 flex-row rounded-lg border border-sand-200 bg-sand-100 p-1 dark:border-sand-700 dark:bg-sand-800">
        <TabButton
          label="Línea de Tiempo"
          isActive={activeTab === 'timeline'}
          onPress={() => setActiveTab('timeline')}
        />
        <TabButton
          label="Clasificación"
          isActive={activeTab === 'standings'}
          onPress={() => setActiveTab('standings')}
        />
      </View>

      {/* Tab content */}
      {activeTab === 'timeline' ? (
        <TimelineTab
          sessions={sessions}
          users={users}
          members={members}
          session={session}
          loading={loading}
          onReloadSessions={loadSessions}
          onNavigateToSession={(sessionId) =>
            router.push({ pathname: '/ledger-session-detail', params: { sessionId } })
          }
        />
      ) : (
        <StandingsTab
          members={members}
          users={users}
          sessions={sessions}
          session={session}
          loading={loading}
          onNavigateToPlayer={(userId) =>
            router.push({ pathname: '/ledger-player-detail', params: { userId } })
          }
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
          ? 'bg-white dark:bg-sand-700'
          : 'bg-transparent'
      }`}
      style={
        isActive
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }
          : undefined
      }
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
