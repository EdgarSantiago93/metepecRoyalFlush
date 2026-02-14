import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { CreateSeasonForm } from './create-season-form';

type Props = {
  users: User[];
  onCreateSeason: (treasurerUserId: string, name?: string) => Promise<void>;
};

export function NoSeason({ users, onCreateSeason }: Props) {
  const auth = useAuth();
  const [showForm, setShowForm] = useState(false);

  if (auth.status !== 'authenticated') return null;

  const isAdmin = auth.user.isAdmin;

  if (showForm && isAdmin) {
    return (
      <CreateSeasonForm
        users={users}
        onSubmit={onCreateSeason}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
      <Text className="mb-2 text-2xl font-bold text-sand-950 dark:text-sand-50">
        No Active Season
      </Text>
      <Text className="mb-8 text-center text-base text-sand-500 dark:text-sand-400">
        {isAdmin
          ? 'Create a new season to get started.'
          : 'Waiting for an admin to create a new season.'}
      </Text>
      {isAdmin && (
        <Pressable
          className="rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
          onPress={() => setShowForm(true)}
        >
          <Text className="text-base font-semibold text-white">Create Season</Text>
        </Pressable>
      )}
    </View>
  );
}
