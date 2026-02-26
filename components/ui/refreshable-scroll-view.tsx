import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  type ScrollViewProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FADE_IN_DURATION = 80;
const FADE_OUT_DURATION = 220;
const DEFAULT_REFRESH_COLOR = '#c49a3c';

type Props = ScrollViewProps & {
  onRefresh: () => Promise<void>;
  refreshColor?: string;
};

export function RefreshableScrollView({
  onRefresh,
  refreshColor = DEFAULT_REFRESH_COLOR,
  children,
  contentContainerStyle,
  ...scrollViewProps
}: Props) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: refreshing ? 1 : 0,
      duration: refreshing ? FADE_IN_DURATION : FADE_OUT_DURATION,
      useNativeDriver: true,
    }).start();
  }, [refreshing, fadeAnim]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const indicatorTop = insets.top + 8;

  return (
    <View className="flex-1">
      <Animated.View
        pointerEvents={refreshing ? 'auto' : 'none'}
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: indicatorTop,
            zIndex: 9999,
            elevation: 9999,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            opacity: fadeAnim,
          },
        ]}
      >
        <View className="rounded-full bg-sand-200/95 px-4 py-2 dark:bg-sand-700/95">
          <ActivityIndicator size="small" color={refreshColor} />
        </View>
      </Animated.View>
      <ScrollView
        contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={refreshColor}
            colors={Platform.OS === 'android' ? [refreshColor] : undefined}
          />
        }
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    </View>
  );
}
