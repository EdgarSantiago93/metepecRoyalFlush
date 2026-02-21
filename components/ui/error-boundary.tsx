import { Image } from 'expo-image';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type ErrorViewProps = {
  message?: string;
  onRetry?: () => void;
};

/**
 * Reusable error state view — shows a message and optional retry button.
 * Use inline when an async operation fails (e.g. API call in useEffect).
 */
export function ErrorView({ message = 'Ocurrió un error', onRetry }: ErrorViewProps) {
  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
      {/* <Text className="mb-2 text-3xl">⚠️</Text> */}


      <Image
          source={require('@/assets/images/error_table.png')}
          style={{ width: 200 , height: 200, marginBottom: 0 }}
          contentFit="contain"
        />



      <Text className="mb-1 text-lg font-heading text-sand-950 dark:text-sand-50">
        Error
      </Text>
      <Text className="mb-6 text-center text-sm text-sand-500 dark:text-sand-400">
        {message}
      </Text>
      {onRetry && (
        <Pressable
          className="rounded-full bg-gold-500 px-6 py-3 active:bg-gold-600"
          onPress={onRetry}
        >
          <Text className="text-base font-semibold text-white">Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * React Error Boundary — catches render errors and shows ErrorView.
 * Wrap around screens or screen groups in the layout.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <ErrorView
            message={this.state.error?.message ?? 'Ocurrió un error inesperado'}
            onRetry={this.handleRetry}
          />
        )
      );
    }
    return this.props.children;
  }
}
