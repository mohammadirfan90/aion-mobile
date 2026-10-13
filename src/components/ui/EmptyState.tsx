import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

export interface UIEmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, icon, actionLabel, onAction }: UIEmptyStateProps) {
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
      {icon}
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {description ? (
        <Text tone="muted" style={{ textAlign: 'center' }}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} />
      ) : null}
    </View>
  );
}
