import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_session_token';

/**
 * Token storage abstraction.
 * - Native (iOS/Android): uses expo-secure-store
 * - Web: in-memory variable (no localStorage for security hygiene)
 */

let webMemoryToken: string | null = null;

async function getSecureStore() {
  return await import('expo-secure-store');
}

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return webMemoryToken;
    }
    const SecureStore = await getSecureStore();
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async set(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      webMemoryToken = token;
      return;
    }
    const SecureStore = await getSecureStore();
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async remove(): Promise<void> {
    if (Platform.OS === 'web') {
      webMemoryToken = null;
      return;
    }
    const SecureStore = await getSecureStore();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
