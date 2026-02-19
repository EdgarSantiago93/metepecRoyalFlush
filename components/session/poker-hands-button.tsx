import { IconInfoCircle } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';

/**
 * A small info/help icon button that navigates to the poker hands reference modal.
 * Intended to be placed in the top-right header area of session screens.
 */
export function PokerHandsButton() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779';

  return (
    <Pressable
      onPress={() => router.push('/poker-hands')}
      hitSlop={12}
      className="items-center justify-center rounded-full p-2 active:bg-sand-200 dark:active:bg-sand-700"
      accessibilityLabel="Referencia de manos de poker"
      accessibilityRole="button"
    >
      <IconInfoCircle size={22} color={iconColor} />
    </Pressable>
  );
}
