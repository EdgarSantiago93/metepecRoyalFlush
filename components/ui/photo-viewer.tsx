/**
 * Full-screen photo viewer with pinch-to-zoom, pan, and double-tap to zoom.
 * Uses correct transform-origin math so zoom is anchored at the pinch point.
 * Based on: https://github.com/Glazzes/react-native-zoom-toolkit
 * Tested with Expo 50, Reanimated 4.x, Gesture Handler 2.x
 */
import { IconX } from '@tabler/icons-react-native';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  Image as RNImage,
  Text,
  useWindowDimensions,
  View,
  type ImageStyle,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Zoom / pan helpers (worklet-safe)
// ---------------------------------------------------------------------------

type PinchOptions = {
  toScale: number;
  fromScale: number;
  origin: { x: number; y: number };
  delta: { x: number; y: number };
  offset: { x: number; y: number };
};

const pinchTransform = ({
  toScale,
  fromScale,
  delta,
  origin,
  offset,
}: PinchOptions) => {
  'worklet';
  const fromPinchX = -1 * (origin.x * fromScale - origin.x);
  const fromPinchY = -1 * (origin.y * fromScale - origin.y);
  const toPinchX = -1 * (origin.x * toScale - origin.x);
  const toPinchY = -1 * (origin.y * toScale - origin.y);
  const x = offset.x + toPinchX - fromPinchX + delta.x;
  const y = offset.y + toPinchY - fromPinchY + delta.y;
  return { x, y };
};

const useVector = (x: number, y?: number) => {
  const x1 = useSharedValue<number>(x);
  const y1 = useSharedValue<number>(y ?? x);
  return { x: x1, y: y1 };
};

const clamp = (lowerBound: number, upperBound: number, value: number) => {
  'worklet';
  return Math.max(lowerBound, Math.min(value, upperBound));
};

const friction = (fraction: number) => {
  'worklet';
  return 0.75 * Math.pow(1 - fraction * fraction, 2);
};

const TIMING_CONFIG = { duration: 200, easing: Easing.linear };

// ---------------------------------------------------------------------------
// PhotoViewer — full-screen modal with zoom/pan/double-tap
// ---------------------------------------------------------------------------

type PhotoViewerProps = {
  visible: boolean;
  uri: string;
  onClose: () => void;
};

export function PhotoViewer({ visible, uri, onClose }: PhotoViewerProps) {
  const { width, height } = useWindowDimensions();

  const childWidth = useSharedValue<number>(1);
  const childHeight = useSharedValue<number>(1);

  const translate = useVector(0, 0);
  const offset = useVector(0, 0);
  const origin = useVector(0, 0);
  const scale = useSharedValue<number>(1);
  const scaleOffset = useSharedValue<number>(1);
  const inset = useSafeAreaInsets();
  const [headerVisible, setHeaderVisible] = useState(true);

  const toggleHeader = () => setHeaderVisible((prev) => !prev);

  const initialFocal = useVector(0, 0);
  const currentFocal = useVector(0, 0);

  const boundaries = useDerivedValue(() => {
    const offsetX = Math.max(0, childWidth.value * scale.value - width) / 2;
    const offsetY = Math.max(0, childHeight.value * scale.value - height) / 2;
    return { x: offsetX, y: offsetY };
  }, [scale, childWidth, childHeight, width, height]);

  const measureChild = (e: LayoutChangeEvent) => {
    childWidth.value = e.nativeEvent.layout.width;
    childHeight.value = e.nativeEvent.layout.height;
  };

  const pinch = Gesture.Pinch()
    .onTouchesMove((e) => {
      if (e.numberOfTouches !== 2) return;
      const one = e.allTouches[0]!;
      const two = e.allTouches[1]!;
      currentFocal.x.value = (one.absoluteX + two.absoluteX) / 2;
      currentFocal.y.value = (one.absoluteY + two.absoluteY) / 2;
    })
    .onStart((e) => {
      initialFocal.x.value = currentFocal.x.value;
      initialFocal.y.value = currentFocal.y.value;
      origin.x.value = e.focalX / scale.value - childWidth.value / 2;
      origin.y.value = e.focalY / scale.value - childHeight.value / 2;
      offset.x.value = translate.x.value;
      offset.y.value = translate.y.value;
      scaleOffset.value = scale.value;
    })
    .onUpdate((e) => {
      const toScale = e.scale * scaleOffset.value;
      const deltaX = currentFocal.x.value - initialFocal.x.value;
      const deltaY = currentFocal.y.value - initialFocal.y.value;
      const { x: toX, y: toY } = pinchTransform({
        toScale,
        fromScale: scaleOffset.value,
        origin: { x: origin.x.value, y: origin.y.value },
        offset: { x: offset.x.value, y: offset.y.value },
        delta: { x: deltaX, y: deltaY },
      });
      const boundX = Math.max(0, childWidth.value * toScale - width) / 2;
      const boundY = Math.max(0, childHeight.value * toScale - height) / 2;
      translate.x.value = clamp(-boundX, boundX, toX);
      translate.y.value = clamp(-boundY, boundY, toY);
      scale.value = toScale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        translate.x.value = withTiming(0);
        translate.y.value = withTiming(0);
      }
    });

  const isWithinBoundX = useSharedValue<boolean>(true);
  const isWithinBoundY = useSharedValue<boolean>(true);
  const pan = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      cancelAnimation(translate.x);
      cancelAnimation(translate.y);
      offset.x.value = translate.x.value;
      offset.y.value = translate.y.value;
    })
    .onChange(({ translationX, translationY, changeX, changeY }) => {
      const toX = offset.x.value + translationX;
      const toY = offset.y.value + translationY;
      const { x: boundX, y: boundY } = boundaries.value;
      isWithinBoundX.value = toX >= -boundX && toX <= boundX;
      isWithinBoundY.value = toY >= -boundY && toY <= boundY;

      if (isWithinBoundX.value) {
        translate.x.value = clamp(-boundX, boundX, toX);
      } else {
        if (childWidth.value * scale.value < width) {
          translate.x.value = clamp(-boundX, boundX, toX);
        } else {
          const fraction = (Math.abs(toX) - boundX) / width;
          const frictionX = friction(clamp(0, 1, fraction));
          translate.x.value += changeX * frictionX;
        }
      }

      if (isWithinBoundY.value) {
        translate.y.value = clamp(-boundY, boundY, toY);
      } else {
        if (childHeight.value * scale.value < height) {
          translate.y.value = clamp(-boundY, boundY, toY);
        } else {
          const fraction = (Math.abs(toY) - boundY) / height;
          const frictionY = friction(clamp(0, 1, fraction));
          translate.y.value += changeY * frictionY;
        }
      }
    })
    .onEnd(({ velocityX, velocityY }) => {
      const { x: boundX, y: boundY } = boundaries.value;
      const toX = clamp(-boundX, boundX, translate.x.value);
      const toY = clamp(-boundY, boundY, translate.y.value);
      translate.x.value = isWithinBoundX.value
        ? withDecay({ velocity: velocityX / 2, clamp: [-boundX, boundX] })
        : withTiming(toX, TIMING_CONFIG);
      translate.y.value = isWithinBoundY.value
        ? withDecay({ velocity: velocityY / 2, clamp: [-boundY, boundY] })
        : withTiming(toY, TIMING_CONFIG);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onStart(() => {
      offset.x.value = translate.x.value;
      offset.y.value = translate.y.value;
    })
    .onEnd((e) => {
      if (scale.value > 2) {
        translate.x.value = withTiming(0);
        translate.y.value = withTiming(0);
        scale.value = withTiming(1);
        return;
      }
      const orgnX = e.x - childWidth.value / 2;
      const orgnY = e.y - childHeight.value / 2;
      const highestScreenDimension = Math.max(width, height);
      const highestImageDimension = Math.max(childWidth.value, childHeight.value);
      const tapOrigin = width > height ? orgnX : orgnY;
      const toScale =
        ((highestScreenDimension + Math.abs(tapOrigin)) /
          highestImageDimension) *
        2;
      const { x, y } = pinchTransform({
        fromScale: scale.value,
        toScale,
        origin: { x: orgnX, y: orgnY },
        offset: { x: offset.x.value, y: offset.y.value },
        delta: { x: 0, y: 0 },
      });
      const boundX = Math.max(0, (childWidth.value * toScale - width) / 2);
      const boundY = Math.max(0, (childHeight.value * toScale - height) / 2);
      translate.x.value = withTiming(clamp(-boundX, boundX, x));
      translate.y.value = withTiming(clamp(-boundY, boundY, y));
      scale.value = withTiming(toScale);
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(300)
    .onEnd(() => {
      runOnJS(toggleHeader)();
    });

  const detectorStyle = useAnimatedStyle(() => {
    const w = childWidth.value * scale.value;
    const h = childHeight.value * scale.value;
    return {
      width: w,
      height: h,
      position: 'absolute' as const,
      left: (width - w) / 2,
      top: (height - h) / 2,
      transform: [
        { translateX: translate.x.value },
        { translateY: translate.y.value },
      ],
    };
  }, [width, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const imageStyle: ImageStyle = {
    width,
    height,
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
        {headerVisible && (
          <View
            style={{
              width: '100%',
              height: 50 + inset.top,
              backgroundColor: 'rgba(119, 119, 119, 0.55)',
              top: 0,
              position: 'absolute',
              left: 0,
              right: 0,
              zIndex: 1000,
            }}
          >
            <Pressable
              className="absolute right-4 top-14 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/60 active:bg-white/30"
              onPress={onClose}
              hitSlop={12}
            >
              <IconX size={22} color="#333333" strokeWidth={3} />
            </Pressable>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <GestureDetector gesture={Gesture.Race(pan, pinch, doubleTap, singleTap)}>
            <Animated.View style={[detectorStyle, { justifyContent: 'center', alignItems: 'center' }]}>
              <Animated.View style={[animatedStyle, imageStyle]} onLayout={measureChild}>
                <RNImage
                  style={imageStyle}
                  source={{ uri }}
                  resizeMode="contain"
                />
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// PhotoThumbnail — small pressable indicator that opens the PhotoViewer
// ---------------------------------------------------------------------------

type PhotoThumbnailProps = {
  uri: string;
  size?: number;
  label?: string;
  blurhash?: string | null;
};

export function PhotoThumbnail({ uri, size = 36, label, blurhash }: PhotoThumbnailProps) {
  const [viewerVisible, setViewerVisible] = useState(false);

  return (
    <>
      <Pressable
        className="flex-row items-center gap-2 active:opacity-70"
        onPress={() => setViewerVisible(true)}
      >
        <View
          className="overflow-hidden rounded-lg border border-sand-200 dark:border-sand-600"
          style={{ width: size, height: size }}
        >
          <Image
            source={{ uri }}
            style={{ width: size, height: size }}
            contentFit="cover"
            transition={250}
            {...(blurhash ? { placeholder: { blurhash } } : undefined)}
          />
        </View>
        {label && (
          <Text className="text-xs text-sand-500 dark:text-sand-400">
            {label}
          </Text>
        )}
      </Pressable>

      <PhotoViewer
        visible={viewerVisible}
        uri={uri}
        onClose={() => setViewerVisible(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// PressablePhoto — larger photo that opens the PhotoViewer on press
// ---------------------------------------------------------------------------

type PressablePhotoProps = {
  uri: string;
  width?: number | string;
  height?: number;
  className?: string;
  blurhash?: string | null;
};

export function PressablePhoto({
  uri,
  width = '100%',
  height = 180,
  className: containerClassName,
  blurhash,
}: PressablePhotoProps) {
  const [viewerVisible, setViewerVisible] = useState(false);

  return (
    <>
      <Pressable
        className={`overflow-hidden active:opacity-80 ${containerClassName ?? 'rounded-lg border border-sand-200 dark:border-sand-700'}`}
        onPress={() => setViewerVisible(true)}
      >
        <Image
          source={{ uri }}
          style={{ width: width as number, height }}
          contentFit="cover"
          transition={250}
          {...(blurhash ? { placeholder: { blurhash } } : undefined)}
        />
      </Pressable>

      <PhotoViewer
        visible={viewerVisible}
        uri={uri}
        onClose={() => setViewerVisible(false)}
      />
    </>
  );
}
