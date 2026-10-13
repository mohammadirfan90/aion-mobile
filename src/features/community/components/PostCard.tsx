/**
 * S19 feed card: author, time, pinned and solved markers, category, title,
 * excerpt, the linked course, then upvote and reply pills.
 */
import { Pressable, View } from 'react-native';
import { BookOpen, CircleCheck, Pin } from 'lucide-react-native';

import type { ForumPostItem } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

import { categoryLabel, excerpt, roleBadge, timeAgo } from '../format';
import { ReplyCountPill, UpvotePill } from './VoteButton';

export function CategoryTag({ category }: { category: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.three,
        paddingVertical: theme.spacing.one,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.muted,
      }}
    >
      <Text variant="label">{categoryLabel(category)}</Text>
    </View>
  );
}

export function PostCard({
  post,
  onPress,
  onUpvote,
}: {
  post: ForumPostItem;
  onPress: () => void;
  onUpvote: () => void;
}) {
  const theme = useTheme();
  const name = post.author?.name ?? 'Deleted user';
  const staff = roleBadge(post.author?.role);
  const body = excerpt(post.content);
  return (
    <Card padded={false}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${post.isPinned ? 'Pinned. ' : ''}${post.title}, by ${name}, ${categoryLabel(post.category)}${post.isSolved ? ', solved' : ''}`}
        style={({ pressed }) => ({
          padding: theme.spacing.four,
          gap: theme.spacing.three,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.three }}>
          <Avatar uri={post.author?.avatarUrl} name={name} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.two }}>
              <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {name}
              </Text>
              {staff ? <Badge label={staff} /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.one }}>
              <Text variant="caption" tone="muted">
                {timeAgo(post.createdAt)}
              </Text>
              {post.isPinned ? (
                <>
                  <Text variant="caption" tone="muted">
                    ·
                  </Text>
                  <Pin size={12} color={theme.colors.foreground} />
                  <Text variant="caption">Pinned</Text>
                </>
              ) : null}
            </View>
          </View>
          <CategoryTag category={post.category} />
        </View>

        <Text variant="heading" numberOfLines={3}>
          {post.title}
        </Text>
        {body ? (
          <Text tone="muted" numberOfLines={2}>
            {body}
          </Text>
        ) : null}

        {post.course || post.isSolved ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.two }}>
            {post.isSolved ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.one,
                  paddingHorizontal: theme.spacing.two,
                  paddingVertical: 2,
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colors.success,
                }}
              >
                <CircleCheck size={12} color={theme.colors.onSuccess} />
                <Text variant="tiny" style={{ color: theme.colors.onSuccess }}>
                  Solved
                </Text>
              </View>
            ) : null}
            {post.course ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.two,
                  paddingHorizontal: theme.spacing.three,
                  paddingVertical: theme.spacing.one,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  maxWidth: '100%',
                }}
              >
                <BookOpen size={14} color={theme.colors.mutedForeground} />
                <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {post.lesson ? `${post.course.title} · ${post.lesson.title}` : post.course.title}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.two,
          marginHorizontal: theme.spacing.four,
          paddingVertical: theme.spacing.three,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <UpvotePill count={post.upvotesCount} active={post.hasUpvoted} onPress={onUpvote} />
        <ReplyCountPill count={post.repliesCount} onPress={onPress} />
      </View>
    </Card>
  );
}

export function PostCardSkeleton() {
  const theme = useTheme();
  return (
    <Card style={{ gap: theme.spacing.three }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={{ flex: 1, gap: theme.spacing.one }}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="30%" height={12} />
        </View>
      </View>
      <Skeleton width="90%" height={20} />
      <Skeleton width="100%" height={14} />
      <Skeleton width="70%" height={14} />
      <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>
        <Skeleton width={64} height={32} radius={16} />
        <Skeleton width={64} height={32} radius={16} />
      </View>
    </Card>
  );
}
