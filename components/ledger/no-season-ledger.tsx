import { Image } from 'expo-image';
import { Text, View } from 'react-native';

export function NoSeasonLedger() {
  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-12 dark:bg-sand-900 text-center">
      <Image
          source={require('@/assets/images/nodata.png')}
          style={{ width: 200, height: 200, marginBottom: 0 }}
          contentFit="contain"
        />
      <Text className="mb-2 text-2xl font-heading text-sand-950 dark:text-sand-50 text-center">
        Todavía no hay datos esta temporada
      </Text>
      <Text className="text-center text-base text-sand-500 dark:text-sand-400">
        El registro mostrará balances de temporada e historial de juegos una vez que se cree una temporada.
      </Text>
    </View>
  );
}
