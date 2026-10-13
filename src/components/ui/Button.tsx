import { ActivityIndicator, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface UIButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  iconLeft,
  iconRight,
  fullWidth = true,
  style,
  ...rest
}: UIButtonProps) {
  const theme = useTheme();

  const height = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  const paddingX = size === 'sm' ? theme.spacing.three : theme.spacing.four;
  const fontVariant: 'body' | 'bodyStrong' | 'caption' =
    size === 'sm' ? 'caption' : 'bodyStrong';

  const palette = (() => {
    switch (variant) {
      case 'primary':
        return {
          bg: theme.colors.primary,
          fg: theme.colors.primaryForeground,
          border: 'transparent',
        };
      case 'secondary':
        return {
          bg: theme.colors.muted,
          fg: theme.colors.foreground,
          border: theme.colors.border,
        };
      case 'ghost':
        return { bg: 'transparent', fg: theme.colors.foreground, border: 'transparent' };
      case 'destructive':
        return {
          bg: theme.colors.destructive,
          fg: '#FFFFFF',
          border: 'transparent',
        };
    }
  })();

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: paddingX,
          borderRadius: theme.radius.full,
          backgroundColor: palette.bg,
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          borderColor: palette.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.two,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {iconLeft}
          <Text variant={fontVariant} style={{ color: palette.fg }}>
            {label}
          </Text>
          {iconRight}
        </>
      )}
    </Pressable>
  );
}
