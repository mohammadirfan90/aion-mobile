import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface UIListItemProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  style,
  ...rest
}: UIListItemProps) {
  const theme = useTheme();
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.three,
          paddingVertical: theme.spacing.three,
          paddingHorizontal: theme.spacing.four,
          backgroundColor: pressed ? theme.colors.muted : 'transparent',
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {leading ? <View>{leading}</View> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}
