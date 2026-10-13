import { type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { Text as RNText } from 'react-native';

import { useTheme, type TypographyVariant } from '@/theme';

export interface UITextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: 'default' | 'muted' | 'primary' | 'destructive' | 'success';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  style?: StyleProp<TextStyle>;
}

export function Text({
  variant = 'body',
  tone = 'default',
  weight,
  style,
  children,
  ...rest
}: UITextProps) {
  const theme = useTheme();
  const t = theme.typography[variant];

  const color =
    tone === 'muted'
      ? theme.colors.mutedForeground
      : tone === 'primary'
        ? theme.colors.primary
        : tone === 'destructive'
          ? theme.colors.destructive
          : tone === 'success'
            ? theme.colors.success
            : theme.colors.foreground;

  const fontFamily =
    weight === 'bold' || (!weight && t.fontWeight === '700')
      ? theme.fonts.bold
      : weight === 'semibold' || (!weight && t.fontWeight === '600')
        ? theme.fonts.semibold
        : weight === 'medium' || (!weight && t.fontWeight === '500')
          ? theme.fonts.medium
          : theme.fonts.regular;

  return (
    <RNText
      {...rest}
      style={[
        {
          color,
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          fontWeight: t.fontWeight,
          fontFamily,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
