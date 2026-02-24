import { getMediaUrl } from '@/services/media/upload';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

type Props = {
  displayName: string;
  avatarMediaId?: string | null;
  localUri?: string | null;
  size: number;
  fallbackClassName?: string;
  fallbackTextClassName?: string;
};

export function UserAvatar({
  displayName,
  avatarMediaId,
  localUri,
  size,
  fallbackClassName = 'bg-sand-200 dark:bg-sand-600',
  fallbackTextClassName = 'text-sand-600 dark:text-sand-300',
}: Props) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);

  useEffect(() => {
    if (localUri || !avatarMediaId) {
      setResolvedUri(null);
      return;
    }

    // If the mediaId is already a URL, use it directly
    if (
      avatarMediaId.startsWith('http://') ||
      avatarMediaId.startsWith('https://') ||
      avatarMediaId.startsWith('file://')
    ) {
      setResolvedUri(avatarMediaId);
      return;
    }

    let cancelled = false;
    getMediaUrl(avatarMediaId)
      .then(({ url }) => {
        if (!cancelled) setResolvedUri(url);
      })
      .catch(() => {
        // Silently fail — fallback to initials
      });
    return () => {
      cancelled = true;
    };
  }, [avatarMediaId, localUri]);

  const imageUri = localUri ?? resolvedUri;

  if (imageUri) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
        <Image
          source={{ uri: imageUri }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      </View>
    );
  }

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View
      className={`items-center justify-center rounded-full ${fallbackClassName}`}
      style={{ width: size, height: size }}
    >
      <Text className={`font-bold ${fallbackTextClassName}`}>{initial}</Text>
    </View>
  );
}
