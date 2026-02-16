import { Text, View } from 'react-native';

export function NoSeasonSession() {
  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
      <Text className="mb-2 text-2xl font-bold text-sand-950 dark:text-sand-50">
        Sin Temporada Activa
      </Text>
      <Text className="text-center text-base text-sand-500 dark:text-sand-400">
        Se debe crear y activar una temporada antes de programar juegos. Revisa la pestaña Temporada para más detalles.
      </Text>
    </View>
  );
}
