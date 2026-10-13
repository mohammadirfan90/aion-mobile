import { Pressable, type PressableProps } from 'react-native';

import { useTheme } from '@/theme';

export interface UIIconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  icon: React.ReactNode;
  label: string;
  size?: number;
  variant?: 'plain' | 'muted';
}

export function IconButton({
  icon,
  label,
  size = 44,
  variant = 'plain',
  disabled,
  ...rest
}: UIIconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        backgroundColor:
          variant === 'muted' ? theme.colors.muted : 'transparent',
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      {icon}
    </Pressable>
  );
}
