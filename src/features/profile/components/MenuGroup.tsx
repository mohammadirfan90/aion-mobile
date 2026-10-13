/**
 * Grouped menu rows used by S25 (Profile) and S27 (Settings): an outlined
 * card of rows, each with an icon tile, a label and an optional trailing
 * value, badge, switch or chevron. Matches the list style in
 * docs/design/S25-profile.png and S27-settings.png.
 */
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, Switch, View, type SwitchProps } from 'react-native';
import { ChevronRight, ExternalLink } from 'lucide-react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.one,
        marginBottom: theme.spacing.two,
      }}
    >
      <Text variant="label" tone="muted" accessibilityRole="header" style={{ letterSpacing: 0.8 }}>
        {children.toUpperCase()}
      </Text>
      {right}
    </View>
  );
}

/** An outlined card with a divider between each child row. */
export function MenuGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 ? <Divider /> : null}
          {row}
        </Fragment>
      ))}
    </Card>
  );
}

export interface MenuRowProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** Muted text on the right (e.g. the app version). */
  value?: string;
  /** A small count/status pill on the right. */
  badge?: string;
  /** Custom trailing element (a switch, a segmented control, …). */
  trailing?: ReactNode;
  /** Chevron (default when pressable), external-link icon, or nothing. */
  accessory?: 'chevron' | 'external' | 'none';
  tone?: 'default' | 'destructive';
  onPress?: () => void;
  accessibilityHint?: string;
  expanded?: boolean;
}

export function MenuRow({
  icon,
  title,
  subtitle,
  value,
  badge,
  trailing,
  accessory,
  tone = 'default',
  onPress,
  accessibilityHint,
  expanded,
}: MenuRowProps) {
  const theme = useTheme();
  const shownAccessory = accessory ?? (onPress && !trailing ? 'chevron' : 'none');

  const content = (
    <>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text tone={tone === 'destructive' ? 'destructive' : 'default'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="caption" tone="muted">
          {value}
        </Text>
      ) : null}
      {badge ? <Badge label={badge} /> : null}
      {trailing}
      {shownAccessory === 'chevron' ? (
        <ChevronRight
          size={18}
          color={theme.colors.mutedForeground}
          style={expanded ? { transform: [{ rotate: '90deg' }] } : undefined}
        />
      ) : shownAccessory === 'external' ? (
        <ExternalLink size={18} color={theme.colors.mutedForeground} />
      ) : null}
    </>
  );

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.three,
    paddingHorizontal: theme.spacing.four,
    paddingVertical: theme.spacing.three,
    minHeight: 64,
  };

  if (!onPress) {
    return (
      // Rows with a control (switch, segmented) stay un-grouped so the control is reachable.
      <View
        style={rowStyle}
        accessible={!trailing}
        accessibilityLabel={trailing ? undefined : [title, subtitle, value].filter(Boolean).join(', ')}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, badge, value].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      style={({ pressed }) => [rowStyle, { backgroundColor: pressed ? theme.colors.muted : 'transparent' }]}
    >
      {content}
    </Pressable>
  );
}

/** A `Switch` tinted with theme tokens (white thumb on a dark track when on, like the designs). */
export function ThemedSwitch(props: Omit<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'>) {
  const theme = useTheme();
  const dark = theme.mode === 'dark';
  const offTrack = dark ? theme.colors.muted : theme.colors.border;
  return (
    <Switch
      {...props}
      trackColor={{ false: offTrack, true: theme.colors.primary }}
      thumbColor={
        props.value ? theme.colors.primaryForeground : dark ? theme.colors.mutedForeground : theme.colors.card
      }
      ios_backgroundColor={offTrack}
    />
  );
}
