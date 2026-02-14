import { Pressable, Text, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';

type Props = {
  name: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  className?: string;
} & Omit<ViewProps, 'className'>;

export function MemberRow({ name, subtitle, right, onPress, className = '', ...rest }: Props) {
  const initial = name.charAt(0).toUpperCase();

  const content = (
    <View className={`flex-row items-center py-3 ${className}`} {...rest}>
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-sand-200 dark:bg-sand-600">
        <Text className="text-lg font-bold text-sand-600 dark:text-sand-300">{initial}</Text>
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
