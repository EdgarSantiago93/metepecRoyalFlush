import Toast from 'react-native-simple-toast';

export function emitGlobalError(message: string): void {
  Toast.show(message, Toast.SHORT);
}
