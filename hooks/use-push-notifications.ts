import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import {
  registerForPushNotifications,
  sendPushTokenToServer,
} from '@/services/push/push-notification-service';
import { getNotificationRoute } from '@/services/push/notification-routing';

export type BannerData = {
  title: string;
  body: string;
  senderName?: string;
  senderAvatarMediaId?: string;
  route: string;
  onDismiss: () => void;
} | null;

export function usePushNotifications() {
  const auth = useAuth();
  const router = useRouter();
  const [bannerData, setBannerData] = useState<BannerData>(null);
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);
  const tokenListener = useRef<EventSubscription | null>(null);

  const dismissBanner = useCallback(() => setBannerData(null), []);

  // Register push token when authenticated
  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    if (Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      const token = await registerForPushNotifications();
      if (token && !cancelled) {
        await sendPushTokenToServer(token);
      }
    })();

    return () => { cancelled = true; };
  }, [auth.status]);

  // Set up notification listeners
  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    if (Platform.OS === 'web') return;

    // Foreground: show in-app banner
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as Record<string, unknown> | undefined;
        const type = (data?.type as string) ?? '';
        const title = (notification.request.content.title as string) ?? '';
        const body = (notification.request.content.body as string) ?? '';
        const senderName = data?.senderName as string | undefined;
        const senderAvatarMediaId = data?.senderAvatarMediaId as string | undefined;

        setBannerData({
          title,
          body,
          senderName,
          senderAvatarMediaId,
          route: getNotificationRoute(type),
          onDismiss: dismissBanner,
        });
      },
    );

    // Background/killed: tap on OS notification → navigate
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        const type = (data?.type as string) ?? '';
        const route = getNotificationRoute(type);
        router.push(route as never);
      },
    );

    // Token refresh: re-send to server
    tokenListener.current = Notifications.addPushTokenListener((tokenData) => {
      sendPushTokenToServer(tokenData.data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      tokenListener.current?.remove();
    };
  }, [auth.status, dismissBanner, router]);

  return { bannerData };
}
