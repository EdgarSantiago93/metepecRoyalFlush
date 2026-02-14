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
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-900">
      <Text className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        No Active Season
      </Text>
      <Text className="mb-8 text-center text-base text-gray-500 dark:text-gray-400">
        {isAdmin
          ? 'Create a new season to get started.'
          : 'Waiting for an admin to create a new season.'}
      </Text>
      {isAdmin && (
        <Pressable
          className="rounded-lg bg-blue-600 px-6 py-3 active:bg-blue-700"
          onPress={() => setShowForm(true)}
        >
          <Text className="text-base font-semibold text-white">Create Season</Text>
        </Pressable>
      )}
    </View>
  );
}
