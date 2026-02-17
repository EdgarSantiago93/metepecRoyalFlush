import { forwardRef } from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';

type AppTextInputProps = TextInputProps & {
  size?: 'default' | 'sm';
};

const BASE =
  'rounded-lg border border-sand-300 text-sand-950 dark:border-sand-600 dark:text-sand-50 font-sans-semibold';

const SIZE_CLASSES = {
  // taller + proper line-height
  default: 'bg-sand-100 px-4  text-base leading-6 min-h-[56px] dark:bg-sand-800',
  sm: 'bg-white px-3 py-3.5 text-sm leading-5 min-h-[44px] dark:bg-sand-800',
} as const;

const PLACEHOLDER_COLOR = {
  // slightly darker = “feels” bolder
  default: '#a79f92',
  sm: '#8a98aa',
} as const;

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(
  ({ size = 'default', className = '', placeholderTextColor, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        className={`${BASE} ${SIZE_CLASSES[size]} ${className}`}
        placeholderTextColor={placeholderTextColor ?? PLACEHOLDER_COLOR[size]}
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        {...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : {})}
        {...props}
      />
    );
  },
);

AppTextInput.displayName = 'AppTextInput';
