import { ActivityIndicator, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import { googleLogoColors as G } from '@/theme/brand';

/**
 * Google's "G" mark, in Google's brand colours (src/theme/brand.ts, D-18).
 */
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill={G.yellow} d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <Path fill={G.red} d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill={G.green} d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill={G.blue} d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </Svg>
  );
}

export interface GoogleButtonProps {
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** Outlined "Continue with Google" button for S02 and S03. */
export function GoogleButton({ label = 'Continue with Google', loading, disabled, onPress }: GoogleButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => ({
        height: 52,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.three,
        opacity: pressed || inactive ? 0.7 : 1,
      })}
    >
      {loading ? <ActivityIndicator color={theme.colors.foreground} /> : <GoogleLogo />}
      <Text variant="bodyStrong">{label}</Text>
    </Pressable>
  );
}

/** "or" separator between Google and the email form. */
export function OrDivider() {
  const theme = useTheme();
  const line = { flex: 1, height: 1, backgroundColor: theme.colors.border };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }} accessibilityRole="none">
      <View style={line} />
      <Text variant="caption" tone="muted">
        or
      </Text>
      <View style={line} />
    </View>
  );
}
