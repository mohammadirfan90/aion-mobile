/**
 * Tiny placeholder used by the P0-11 navigation skeleton. Each placeholder
 * screen renders the screen ID (`TODO Sxx`) so the verify script can count
 * how many of the 34 routes are still unimplemented. Phase 1 replaces this
 * with the real screen from `docs/SCREENS.md`.
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

export interface PlaceholderProps {
  /** Screen ID like "S07". Rendered as `TODO S07`. */
  screen: string;
  /** Optional subtitle so each placeholder can describe itself. */
  description?: string;
}

export function Placeholder({ screen, description }: PlaceholderProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text style={[styles.title, { color: theme.colors.foreground }]}>
        TODO {screen}
      </Text>
      {description ? (
        <Text
          style={[
            styles.description,
            { color: theme.colors.mutedForeground },
          ]}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
  },
});