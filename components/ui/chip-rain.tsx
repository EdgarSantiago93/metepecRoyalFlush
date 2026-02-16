import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CHIP_PALETTES = [
  { bg: '#c49a3c', edge: '#a67b1e' }, // Gold
  { bg: '#dc2626', edge: '#991b1b' }, // Red
  { bg: '#ede8df', edge: '#b5ac9e' }, // Cream
  { bg: '#2a9d68', edge: '#1a5038' }, // Green
  { bg: '#252119', edge: '#574f45' }, // Black
];

type ChipConfig = {
  id: number;
  x: number;
  size: number;
  palette: (typeof CHIP_PALETTES)[number];
  fallDuration: number;
  swayAmp: number;
  swayDuration: number;
  spinDuration: number;
  delay: number;
  opacity: number;
};

function makeChips(count: number): ChipConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * (SCREEN_W - 48),
    size: 18 + Math.random() * 28, // 18–46px
    palette: CHIP_PALETTES[Math.floor(Math.random() * CHIP_PALETTES.length)],
    fallDuration: 6000 + Math.random() * 8000, // 6–14s
    swayAmp: 12 + Math.random() * 28, // 12–40px
    swayDuration: 2000 + Math.random() * 3000, // 2–5s per half-cycle
    spinDuration: 3000 + Math.random() * 5000, // 3–8s per rotation
    delay: Math.random() * 4000, // stagger 0–4s
    opacity: 0.3 + Math.random() * 0.5, // 10–30%
  }));
}

// ---------------------------------------------------------------------------
// Single falling chip
// ---------------------------------------------------------------------------

function FallingChip({ c }: { c: ChipConfig }) {
  const translateY = useSharedValue(-c.size - 10);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Fall: top → bottom, snap back, repeat
    translateY.value = withDelay(
      c.delay,
      withRepeat(
        withTiming(SCREEN_H + c.size + 10, {
          duration: c.fallDuration,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );

    // Sway: oscillate left ↔ right
    translateX.value = withDelay(
      c.delay,
      withRepeat(
        withSequence(
          withTiming(c.swayAmp, {
            duration: c.swayDuration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(-c.swayAmp, {
            duration: c.swayDuration * 2,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: c.swayDuration,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        false,
      ),
    );

    // Spin
    rotate.value = withDelay(
      c.delay,
      withRepeat(
        withTiming(360, {
          duration: c.spinDuration,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: c.opacity,
  }));

  return (
    <Animated.View
      style={[{ position: 'absolute', left: c.x, width: c.size, height: c.size }, style]}
    >
      <ChipShape size={c.size} palette={c.palette} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Chip visual — circle with edge border + center stripe
// ---------------------------------------------------------------------------

const NOTCH_ANGLES = [0, 45, 90, 135];

export function ChipShape({
  size,
  palette,
}: {
  size: number;
  palette: (typeof CHIP_PALETTES)[number];
}) {
  const innerSize = size * 0.72;
  const innerBorder = Math.max(1, size * 0.04);
  const notchW = Math.max(2, size * 0.14);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.edge,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* White edge notches — 4 bars through center = 8 visible marks */}
      {NOTCH_ANGLES.map((deg) => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            width: notchW,
            height: size,
            backgroundColor: '#ffffff',
            transform: [{ rotate: `${deg}deg` }],
          }}
        />
      ))}

      {/* Inner circle — covers center, reveals only edge notches */}
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: palette.bg,
          borderWidth: innerBorder,
          borderColor: palette.edge,
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Rain container — renders behind content via absolute fill
// ---------------------------------------------------------------------------

export function ChipRain({ count = 40 }: { count?: number }) {
  const chips = useMemo(() => makeChips(count), [count]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {chips.map((c) => (
        <FallingChip key={c.id} c={c} />
      ))}
    </View>
  );
}
