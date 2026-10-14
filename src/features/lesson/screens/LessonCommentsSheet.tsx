import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowUp, CornerDownRight, ThumbsUp, Trash2, X } from 'lucide-react-native';

import type { Comment } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

import { useLessonComments } from '../hooks';

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'just now';
  const now = Date.now();
  const past = new Date(dateString).getTime();
  if (Number.isNaN(past)) return 'just now';
  const diffSec = Math.max(0, Math.floor((now - past) / 1000));

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const diffWeek = Math.floor(diffDay / 7);
  return `${diffWeek}w`;
}

interface ReplyingTarget {
  id: string;
  authorName: string;
}

export function LessonCommentsSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);

  const { id, courseId, chapterId } = useLocalSearchParams<{
    id?: string;
    courseId?: string;
    chapterId?: string;
  }>();

  // Standalone fallback fixture lesson ID per TRACKER.md
  const lessonId =
    typeof id === 'string' && id && id !== '[id]' ? id : 'l-intro-01-01';

  const {
    threads,
    totalCount,
    isLoading,
    isPosting,
    error,
    currentUserId,
    refetch,
    postComment,
    deleteComment,
    toggleUpvote,
  } = useLessonComments(
    lessonId,
    typeof courseId === 'string' ? courseId : undefined,
    typeof chapterId === 'string' ? chapterId : undefined
  );

  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ReplyingTarget | null>(null);

  const handleStartReply = (targetComment: Comment) => {
    const authorName = targetComment.author?.name ?? 'User';
    // If the target is already a reply, link to its parent or directly to it
    setReplyingTo({
      id: targetComment.parentId ?? targetComment.id,
      authorName,
    });
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isPosting) return;

    const parentId = replyingTo?.id ?? null;
    setInputText('');
    setReplyingTo(null);
    await postComment(text, parentId);
  };

  const handleDeletePrompt = (commentId: string) => {
    Alert.alert(
      'Delete comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteComment(commentId);
          },
        },
      ]
    );
  };

  const renderCommentItem = (item: Comment, isReply = false) => {
    const author = item.author;
    const authorName = author?.name ?? (item.userId === currentUserId ? 'You' : 'Student');
    const isInstructor = author?.role === 'instructor' || author?.role === 'admin';
    const isOwn = item.userId === currentUserId;
    const upvotes = item.upvotes ?? item.upvotesCount ?? 0;

    return (
      <View
        key={item.id}
        style={{
          flexDirection: 'row',
          gap: theme.spacing.three,
          paddingVertical: theme.spacing.two,
        }}
      >
        <Avatar
          uri={author?.avatarUrl}
          name={authorName}
          size={isReply ? 32 : 38}
        />

        <View style={{ flex: 1 }}>
          {/* Header row: Author Name, Badge, Relative Time */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.two,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: theme.spacing.two,
                flex: 1,
              }}
            >
              <Text variant="bodyStrong" weight="semibold">
                {authorName}
              </Text>
              {isInstructor && (
                <Badge label="Instructor" tone="primary" />
              )}
              {isOwn && (
                <Badge label="You" tone="neutral" />
              )}
            </View>

            <Text variant="caption" tone="muted">
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>

          {/* Comment body */}
          <Text
            variant="body"
            style={{
              marginTop: theme.spacing.one,
              lineHeight: 22,
              color: theme.colors.foreground,
            }}
          >
            {item.content}
          </Text>

          {/* Action row: Reply, Upvote, Delete */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: theme.spacing.two,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.four }}>
              <Pressable
                onPress={() => handleStartReply(item)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Reply to ${authorName}`}
              >
                <Text variant="caption" weight="medium" tone="muted">
                  Reply
                </Text>
              </Pressable>

              <Pressable
                onPress={() => void toggleUpvote(item.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Upvote comment, currently ${upvotes} upvotes`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <ThumbsUp
                  size={14}
                  color={item.upvoted ? theme.colors.primary : theme.colors.mutedForeground}
                  fill={item.upvoted ? theme.colors.primary : 'transparent'}
                />
                {upvotes > 0 ? (
                  <Text
                    variant="caption"
                    style={{
                      color: item.upvoted ? theme.colors.primary : theme.colors.mutedForeground,
                      fontFamily: item.upvoted ? theme.fonts.semibold : theme.fonts.regular,
                    }}
                  >
                    {upvotes}
                  </Text>
                ) : null}
              </Pressable>
            </View>

            {isOwn && (
              <Pressable
                onPress={() => handleDeletePrompt(item.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Delete comment"
              >
                <Trash2 size={16} color={theme.colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  const canSend = inputText.trim().length > 0 && !isPosting;

  return (
    <KeyboardAvoidingView
      style={{
        // The sheet sizes to its content (`fitToContents`), so it sets its own
        // height; at a half detent Android cut the composer off.
        height: Math.round(height * 0.85),
        backgroundColor: theme.colors.card,
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* iOS sheet grabber handle */}
      <View
        style={{
          alignItems: 'center',
          paddingTop: theme.spacing.two,
          paddingBottom: theme.spacing.one,
        }}
      >
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: theme.radius.full,
            backgroundColor: theme.colors.mutedForeground,
            opacity: 0.35,
          }}
        />
      </View>

      {/* Sheet Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.four,
          paddingVertical: theme.spacing.two,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text variant="heading" weight="bold">
            Comments
          </Text>
          <Text variant="heading" tone="muted">
            · {totalCount}
          </Text>
        </View>

        <IconButton
          icon={<X size={20} color={theme.colors.foreground} />}
          label="Close comments"
          size={36}
          onPress={() => router.back()}
        />
      </View>

      <Divider />

      {/* Main content list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.four,
          paddingVertical: theme.spacing.three,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading ? (
          <View style={{ gap: theme.spacing.four, paddingVertical: theme.spacing.two }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.three }}>
              <Skeleton width={38} height={38} radius={19} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="40%" height={16} />
                <Skeleton width="90%" height={14} />
                <Skeleton width="70%" height={14} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.three }}>
              <Skeleton width={38} height={38} radius={19} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="50%" height={16} />
                <Skeleton width="95%" height={14} />
                <Skeleton width="60%" height={14} />
              </View>
            </View>
          </View>
        ) : error ? (
          <ErrorState description={error} onRetry={() => void refetch()} />
        ) : threads.length === 0 ? (
          <EmptyState
            title="No comments yet"
            description="Be the first to ask a question or leave feedback for this lesson."
          />
        ) : (
          threads.map((thread, index) => (
            <View key={thread.id}>
              {/* Top-level comment */}
              {renderCommentItem(thread, false)}

              {/* Threaded replies indented one level */}
              {thread.replies && thread.replies.length > 0 && (
                <View
                  style={{
                    marginLeft: 20,
                    paddingLeft: theme.spacing.three,
                    borderLeftWidth: 1.5,
                    borderLeftColor: theme.colors.border,
                    marginTop: 2,
                  }}
                >
                  {thread.replies.map((reply) => renderCommentItem(reply, true))}
                </View>
              )}

              {/* Divider between top-level threads */}
              {index < threads.length - 1 && (
                <View style={{ marginVertical: theme.spacing.two }}>
                  <Divider />
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Composer Container */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.card,
          paddingHorizontal: theme.spacing.four,
          paddingTop: theme.spacing.two,
          paddingBottom: Math.max(insets.bottom, theme.spacing.three),
        }}
      >
        {/* Replying indicator chip banner */}
        {replyingTo && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              alignSelf: 'flex-start',
              backgroundColor: theme.colors.muted,
              paddingVertical: 4,
              paddingHorizontal: theme.spacing.three,
              borderRadius: theme.radius.full,
              marginBottom: theme.spacing.two,
              gap: theme.spacing.two,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CornerDownRight size={13} color={theme.colors.mutedForeground} />
              <Text variant="caption" tone="muted">
                Replying to{' '}
                <Text variant="caption" weight="semibold">
                  {replyingTo.authorName}
                </Text>
              </Text>
            </View>

            <Pressable
              onPress={handleCancelReply}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cancel replying"
            >
              <X size={14} color={theme.colors.mutedForeground} />
            </Pressable>
          </View>
        )}

        {/* Text Input Row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: theme.spacing.two,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: theme.colors.muted,
              borderRadius: theme.radius.full,
              paddingHorizontal: theme.spacing.four,
              paddingVertical: Platform.OS === 'ios' ? 10 : 6,
              minHeight: 44,
              maxHeight: 120,
              justifyContent: 'center',
            }}
          >
            <TextInput
              ref={inputRef}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                replyingTo
                  ? `Reply to ${replyingTo.authorName}...`
                  : 'Add a comment...'
              }
              placeholderTextColor={theme.colors.mutedForeground}
              multiline
              style={{
                color: theme.colors.foreground,
                fontSize: theme.typography.body.fontSize,
                lineHeight: 20,
                padding: 0,
              }}
              accessibilityLabel="Comment text input"
            />
          </View>

          <Pressable
            onPress={() => void handleSend()}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send comment"
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !canSend ? 0.35 : pressed ? 0.8 : 1,
            })}
          >
            <ArrowUp
              size={20}
              color={theme.colors.primaryForeground}
              strokeWidth={2.5}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
