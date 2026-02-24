import { Pressable, Text, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import { UserAvatar } from './user-avatar';

type Props = {
  name: string;
  avatarMediaId?: string | null;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  className?: string;
} & Omit<ViewProps, 'className'>;

export function MemberRow({ name, avatarMediaId, subtitle, right, onPress, className = '', ...rest }: Props) {
  const content = (
    <View className={`flex-row items-center py-3 ${className}`} {...rest}>
      <View className="mr-3">
        <UserAvatar displayName={name} avatarMediaId={avatarMediaId} size={40} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium text-sand-950 dark:text-sand-50">{name}</Text>
        {subtitle ? (
          <Text className="text-xs text-sand-500 dark:text-sand-400">{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-70">
        {content}
      </Pressable>
    );
  }

  return content;
}
