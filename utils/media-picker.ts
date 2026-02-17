import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, ActionSheetIOS } from 'react-native';

type PickMediaOptions = {
  quality?: number;
};

/**
 * Shows a Camera/Library chooser and returns the selected image URI.
 * Handles permissions for both sources.
 */
export async function pickMedia(
  options: PickMediaOptions = {},
): Promise<string | null> {
  const { quality = 0.8 } = options;

  return new Promise((resolve) => {
    const launch = async (source: 'camera' | 'library') => {
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality,
      };

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso necesario', 'Se necesita acceso a la cámara.');
          resolve(null);
          return;
        }
        const result = await ImagePicker.launchCameraAsync(pickerOptions);
        resolve(!result.canceled && result.assets[0] ? result.assets[0].uri : null);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso necesario', 'Se necesita acceso a la galería.');
          resolve(null);
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
        resolve(!result.canceled && result.assets[0] ? result.assets[0].uri : null);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Cámara', 'Galería'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) launch('camera');
          else if (buttonIndex === 2) launch('library');
          else resolve(null);
        },
      );
    } else {
      Alert.alert('Seleccionar foto', 'Elige una opción', [
        { text: 'Cámara', onPress: () => launch('camera') },
        { text: 'Galería', onPress: () => launch('library') },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ]);
    }
  });
}
