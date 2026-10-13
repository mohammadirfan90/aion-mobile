/**
 * Header for the pushed profile screens (S26, S27): left slot, centred title,
 * right slot, under the safe-area inset. Both slots share a min width so the
 * title stays centred.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

export function StackHeader({
  title,
  left,
  right,
  bordered = false,
}: {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  bordered?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slot = { minWidth: 72, flexDirection: 'row' as const, alignItems: 'center' as const };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: insets.top + theme.spacing.two,
        paddingHorizontal: theme.spacing.four,
        paddingBottom: theme.spacing.two,
        gap: theme.spacing.two,
        borderBottomWidth: bordered ? 1 : 0,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.background,
      }}
    >
      <View style={[slot, { justifyContent: 'flex-start' }]}>{left}</View>
      <Text variant="heading" accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
        {title}
      </Text>
      <View style={[slot, { justifyContent: 'flex-end' }]}>{right}</View>
    </View>
  );
}
