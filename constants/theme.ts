/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#c49a3c'; // gold-500


const defaultTheme = {
  // text: '#1a1714', // sand-950
  text: '#333333', // sand-950
  background: '#fdfbf7', // sand-50
  tint: tintColorLight,
  icon: '#918779', // sand-500
  tabIconDefault: '#918779', // sand-500
  tabIconSelected: tintColorLight,
}

export const Colors = {
  light: defaultTheme,
  dark: defaultTheme,
};

export const Fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  heading: 'Merriweather_700Bold',
  headingRegular: 'Merriweather_400Regular',
  mono: Platform.select({
    ios: 'ui-monospace',
    web: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    default: 'monospace',
  }),
};
