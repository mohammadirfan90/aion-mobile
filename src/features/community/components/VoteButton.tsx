/**
 * Upvote and reply-count pills (S19 cards, S20 post and replies). The upvote
 * pill fills with the primary color once the user has upvoted.
 */
import { Pressable } from 'react-native';
import { ArrowUp, MessageSquare } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

import { compactCount } from '../format';

export function UpvotePill({
  count,
  active,
  onPress,
  small,
}: {
  count: number;
  active: boolean;
  onPress?: () => void;
  small?: boolean;
}) {
  const theme = useTheme();
  const fg = active ? theme.colors.primaryForeground : theme.colors.foreground;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${active ? 'Remove upvote' : 'Upvote'}, ${count} ${count === 1 ? 'upvote' : 'upvotes'}`}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.one,
        minHeight: small ? 32 : 36,
        paddingHorizontal: small ? theme.spacing.two + 2 : theme.spacing.three,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.border,
        backgroundColor: active ? theme.colors.primary : theme.colors.muted,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <ArrowUp size={small ? 14 : 16} color={fg} strokeWidth={2.5} />
      <Text variant="label" style={{ color: fg }}>
        {compactCount(count)}
      </Text>
    </Pressable>
  );
}

export function ReplyCountPill({ count, onPress }: { count: number; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${count} ${count === 1 ? 'reply' : 'replies'}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.one,
        minHeight: 36,
        paddingHorizontal: theme.spacing.three,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <MessageSquare size={16} color={theme.colors.foreground} />
      <Text variant="label">{compactCount(count)}</Text>
    </Pressable>
  );
}
