import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { httpAuth } from '@/services/api/http-auth-client';

// Suppress OS foreground notification — we show our own banner
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request permissions and get an Expo push token.
 * Returns null on web or if permissions are denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) {
    console.log('[Push] Not a physical device — skipping push token registration');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted');
    return null;
  }

  await setupNotificationChannel();

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('[Push] No EAS projectId found — cannot get push token');
    return null;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

/** Send the push token to the backend for storage. */
export async function sendPushTokenToServer(token: string): Promise<void> {
  try {
    await httpAuth.updatePushToken(token);
  } catch (err) {
    console.warn('[Push] Failed to send push token to server', err);
  }
}

/** Clear the push token on the backend. */
export async function clearPushTokenFromServer(): Promise<void> {
  try {
    await httpAuth.updatePushToken(null);
  } catch (err) {
    console.warn('[Push] Failed to clear push token from server', err);
  }
}

/** Set up the default notification channel for Android. */
async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Poker',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#c49a3c',
  });
}
