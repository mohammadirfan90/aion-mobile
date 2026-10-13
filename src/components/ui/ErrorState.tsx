import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

export interface UIErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again in a moment.',
  onRetry,
  retryLabel = 'Try again',
}: UIErrorStateProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.six,
        gap: theme.spacing.three,
      }}
    >
      <Text variant="heading" tone="destructive" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text tone="muted" style={{ textAlign: 'center' }}>
        {description}
      </Text>
      {onRetry ? (
        <Button label={retryLabel} onPress={onRetry} fullWidth={false} />
      ) : null}
    </View>
  );
}
