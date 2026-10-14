/**
 * "Waking the server…" banner (INTEGRATION.md §2, decision 5). Shown while the
 * first API request of a cold start has been waiting for more than 5 s.
 */
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useServerStatus } from '@/api/server-status';
import { Radius, Spacing, useTheme } from '@/theme';

export function ServerWakeBanner() {
  const waking = useServerStatus((s) => s.waking);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (!waking) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + Spacing.two }]}>
      <View
        accessibilityRole="alert"
        accessibilityLabel="Waking the server, this can take up to a minute"
        style={[styles.pill, { backgroundColor: theme.colors.primary }]}
      >
        <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
        <Text variant="label" style={{ color: theme.colors.primaryForeground }}>
          Waking the server… this can take up to a minute
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.full,
  },
});
