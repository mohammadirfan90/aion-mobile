import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface UIHeaderProps {
  title: string;
  subtitle?: string;
  back?: React.ReactNode;
  trailing?: React.ReactNode;
  align?: 'center' | 'left';
}

export function Header({ title, subtitle, back, trailing, align = 'left' }: UIHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.two,
        paddingHorizontal: theme.spacing.four,
        paddingBottom: theme.spacing.three,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.two,
        backgroundColor: theme.colors.background,
      }}
    >
      {back ? <View>{back}</View> : null}
      <View style={{ flex: 1, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
        <Text variant="title">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>{trailing}</View> : null}
    </View>
  );
}

// Re-export the icon-only back button as a convenience.
export function HeaderBackButton({ onPress }: { onPress: () => void }) {
  return (
    <IconButton
      onPress={onPress}
      label="Back"
      size={40}
      icon={
        <Text variant="title" tone="muted">
          ‹
        </Text>
      }
    />
  );
}
