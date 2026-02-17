import { IconX } from '@tabler/icons-react-native';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// PhotoViewer — full-screen modal to view a photo
// ---------------------------------------------------------------------------

type PhotoViewerProps = {
  visible: boolean;
  uri: string;
  onClose: () => void;
};

export function PhotoViewer({ visible, uri, onClose }: PhotoViewerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/95">
        {/* Close button */}
        <Pressable
          className="absolute right-4 top-14 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
          onPress={onClose}
          hitSlop={12}
        >
          <IconX size={22} color="#fff" />
        </Pressable>

        {/* Image centered */}
        <View className="flex-1 items-center justify-center px-4">
          <Image
            source={{ uri }}
            style={{
              width: SCREEN_WIDTH - 32,
              height: SCREEN_HEIGHT * 0.7,
            }}
            contentFit="contain"
            transition={200}
          />
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
  /** Size of the thumbnail in pixels. Defaults to 36. */
  size?: number;
  /** Optional label shown next to the icon. */
  label?: string;
};

/**
 * A small thumbnail that indicates a photo exists. When pressed, opens
 * the full-screen PhotoViewer. Use this instead of inline Image displays
 * to keep card heights consistent.
 */
export function PhotoThumbnail({ uri, size = 36, label }: PhotoThumbnailProps) {
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
            transition={100}
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
// PressablePhoto — a larger photo display that opens the PhotoViewer on press
// ---------------------------------------------------------------------------

type PressablePhotoProps = {
  uri: string;
  /** Width of the photo. Defaults to '100%'. */
  width?: number | string;
  /** Height of the photo in pixels. Defaults to 180. */
  height?: number;
  /** Border radius class name. Defaults to 'rounded-lg'. */
  className?: string;
};

/**
 * A larger photo display (e.g. for deposit proofs) that opens the
 * full-screen PhotoViewer when pressed.
 */
export function PressablePhoto({
  uri,
  width = '100%',
  height = 180,
  className: containerClassName,
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
          transition={100}
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
