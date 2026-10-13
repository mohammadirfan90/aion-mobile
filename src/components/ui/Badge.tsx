import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface UIBadgeProps {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'destructive';
}

export function Badge({ label, tone = 'neutral' }: UIBadgeProps) {
  const theme = useTheme();
  const palette = (() => {
    switch (tone) {
      case 'primary':
        return { bg: theme.colors.primary, fg: theme.colors.primaryForeground };
      case 'success':
        return { bg: theme.colors.success, fg: '#FFFFFF' };
      case 'warning':
        return { bg: theme.colors.warning, fg: '#FFFFFF' };
      case 'destructive':
        return { bg: theme.colors.destructive, fg: '#FFFFFF' };
      default:
        return { bg: theme.colors.muted, fg: theme.colors.foreground };
    }
  })();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: theme.spacing.two,
        paddingVertical: 2,
        borderRadius: theme.radius.full,
        backgroundColor: palette.bg,
      }}
    >
      <Text variant="tiny" style={{ color: palette.fg }}>
        {label}
      </Text>
    </View>
  );
}
