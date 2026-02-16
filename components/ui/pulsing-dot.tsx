// ---------------------------------------------------------------------------
// Pulsing dot animation
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export function PulsingDot({ color='#c49a3c' }: { color?: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity, backgroundColor: color }}
      className="h-2.5 w-2.5 rounded-full"
    />
  );
}
