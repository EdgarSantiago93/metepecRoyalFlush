import { Image } from 'expo-image';
import { View } from 'react-native';

type LoaderProps = {
  size?: number;
  className?: string;
};

export function Loader({ size = 120, className }: LoaderProps) {
  return (
    <View className={`items-center justify-center ${className ?? ''}`}>
      <Image
        source={require('@/assets/images/loader.gif')}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    </View>
  );
}
