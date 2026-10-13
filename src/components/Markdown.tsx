/**
 * Markdown renderer on theme tokens (SPEC §1, CONTEXT D-13). Uses
 * `react-native-marked`'s `useMarkdown` hook, which returns plain elements,
 * so it can sit inside any ScrollView (the `<Markdown>` component is a
 * FlatList and can't be nested).
 */
import { Fragment, useMemo } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { useMarkdown, type MarkedStyles } from 'react-native-marked';

import { useTheme } from '@/theme';

export const MONO_FONT = Platform.select({ ios: 'Menlo', default: 'monospace' });

export interface MarkdownProps {
  value: string;
  /** Smaller text (13/18), e.g. inside cards and chat bubbles. */
  compact?: boolean;
  /** Text color override, e.g. on a primary-colored chat bubble. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Markdown({ value, compact = false, color, style }: MarkdownProps) {
  const theme = useTheme();
  const text = color ?? theme.colors.foreground;
  const size = compact ? theme.typography.caption : theme.typography.body;

  const styles = useMemo<MarkedStyles>(
    () => ({
      text: { color: text, fontFamily: theme.fonts.regular, ...size, fontWeight: undefined },
      paragraph: { paddingVertical: theme.spacing.one },
      strong: { fontFamily: theme.fonts.semibold, fontWeight: undefined },
      em: { fontStyle: 'italic' },
      link: { color: text, textDecorationLine: 'underline' },
      h1: { color: text, fontFamily: theme.fonts.bold, ...theme.typography.title, fontWeight: undefined },
      h2: { color: text, fontFamily: theme.fonts.semibold, ...theme.typography.heading, fontWeight: undefined },
      h3: { color: text, fontFamily: theme.fonts.semibold, ...theme.typography.bodyStrong, fontWeight: undefined },
      h4: { color: text, fontFamily: theme.fonts.semibold, ...size, fontWeight: undefined },
      codespan: {
        fontFamily: MONO_FONT,
        fontStyle: 'normal',
        fontSize: size.fontSize - 1,
        backgroundColor: theme.colors.muted,
        color: text,
      },
      code: {
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.three,
        marginVertical: theme.spacing.two,
      },
      codeText: { fontFamily: MONO_FONT, fontSize: 13, lineHeight: 19, color: text },
      blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.border,
        paddingLeft: theme.spacing.three,
        marginVertical: theme.spacing.one,
      },
      li: { color: text, fontFamily: theme.fonts.regular, ...size, fontWeight: undefined },
      list: { marginVertical: theme.spacing.one },
      hr: { backgroundColor: theme.colors.border, height: 1, marginVertical: theme.spacing.three },
      image: { borderRadius: theme.radius.lg },
    }),
    [text, size, theme],
  );

  const elements = useMarkdown(value, {
    colorScheme: theme.mode,
    theme: {
      colors: {
        text,
        link: text,
        code: theme.colors.muted,
        border: theme.colors.border,
      },
    },
    styles,
  });

  return (
    <View style={style}>
      {elements.map((el, i) => (
        <Fragment key={i}>{el}</Fragment>
      ))}
    </View>
  );
}
