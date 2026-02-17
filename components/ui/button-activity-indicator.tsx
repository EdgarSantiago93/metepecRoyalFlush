import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';

type Props = Pick<ActivityIndicatorProps, 'color'>;

/**
 * Small activity indicator for use inside buttons (replaces Loader in button loading states).
 */
export function ButtonActivityIndicator({ color = '#ffffff' }: Props) {
  return <ActivityIndicator size="small" color={color} />;
}
