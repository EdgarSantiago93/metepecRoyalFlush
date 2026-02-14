import { Text, View } from 'react-native';
import type { ApprovalStatus } from '@/types';

type Variant = ApprovalStatus;

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; label: string }> = {
  not_submitted: {
    bg: 'bg-sand-200 dark:bg-sand-700',
    text: 'text-sand-600 dark:text-sand-300',
    label: 'Not submitted',
  },
  pending: {
    bg: 'bg-gold-100 dark:bg-gold-900',
    text: 'text-gold-700 dark:text-gold-300',
    label: 'Pending',
  },
  approved: {
    bg: 'bg-felt-100 dark:bg-felt-900/40',
    text: 'text-felt-700 dark:text-felt-300',
    label: 'Approved',
  },
  rejected: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-700 dark:text-red-300',
    label: 'Rejected',
  },
};

type Props = {
  variant: Variant;
  label?: string;
};

export function StatusBadge({ variant, label }: Props) {
  const styles = VARIANT_STYLES[variant];
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${styles.bg}`}>
      <Text className={`text-xs font-semibold ${styles.text}`}>
        {label ?? styles.label}
      </Text>
    </View>
  );
}
