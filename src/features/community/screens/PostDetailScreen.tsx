/**
 * S20 — Forum post detail. Matches `docs/design/S20-post-detail.png`.
 *
 *   - Header: back, "Post", and (for the author) a menu with Edit / Delete.
 *   - The post: author, time, linked course, category, title, markdown
 *     content, image, an upvote pill (optimistic) and the reply count.
 *   - Replies, threaded one level deep from the flat list (API §10). The
 *     accepted solution is pinned to the top with a "Solution" badge. The post
 *     author sees **Mark as solution** on the other replies.
 *   - A reply composer at the bottom; "Reply" on a reply threads under it.
 *   - Edit is inline (title and content). Delete returns to S19, whose feed
 *     and stats are invalidated by the hook.
 *
 * Not built from the design: the attach button in the composer (replies
 * have no attachments in API §10) and the share icon.
 */
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import {
  ArrowUp,
  BookOpen,
  ChevronLeft,
  CircleCheck,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from 'lucide-react-native';

import type { ForumPostItem, ForumReplyItem } from '@/api/types';
import { Markdown } from '@/components/Markdown';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { useTheme, type Theme } from '@/theme';

import { OptionSheet } from '../components/OptionSheet';
import { CategoryTag } from '../components/PostCard';
import { PostImage } from '../components/PostImage';
import { ReplyCountPill, UpvotePill } from '../components/VoteButton';
import { roleBadge, timeAgo } from '../format';
import {
  useCreateReply,
  useCurrentUser,
  useDeletePost,
  useForumPost,
  useForumReplies,
  useMarkSolution,
  usePostUpvote,
  useReplyUpvote,
  useUpdatePost,
} from '../hooks';
import { editPostSchema, REPLY_MAX, replySchema, TITLE_MAX, type EditPostForm } from '../schemas';

interface Thread {
  reply: ForumReplyItem;
  children: ForumReplyItem[];
}

/**
 * Threads the flat reply list one level deep. The solution always sits on top
 * as its own thread; deeper replies join their top-level ancestor's thread.
 */
function buildThreads(replies: ForumReplyItem[]): Thread[] {
  const byId = new Map(replies.map((r) => [r.id, r]));
  const rootOf = (r: ForumReplyItem): ForumReplyItem => {
    let cur = r;
    const seen = new Set<string>();
    while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
      seen.add(cur.id);
      const parent = byId.get(cur.parentId) as ForumReplyItem;
      if (parent.isSolution) return parent;
      cur = parent;
    }
    return cur;
  };
  const roots: ForumReplyItem[] = [];
  const children = new Map<string, ForumReplyItem[]>();
  for (const r of replies) {
    const root = r.isSolution ? r : rootOf(r);
    if (root.id === r.id) {
      roots.push(r);
    } else {
      children.set(root.id, [...(children.get(root.id) ?? []), r]);
    }
  }
  const byTime = (a: ForumReplyItem, b: ForumReplyItem) => a.createdAt.localeCompare(b.createdAt);
  return roots
    .sort((a, b) => Number(b.isSolution) - Number(a.isSolution) || byTime(a, b))
    .map((reply) => ({ reply, children: (children.get(reply.id) ?? []).sort(byTime) }));
}

const errorCode = (e: unknown) => (e as { code?: string } | null)?.code ?? '';

export function PostDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const postId = typeof params.id === 'string' ? params.id : '';

  const me = useCurrentUser();
  const postQ = useForumPost(postId || null);
  const repliesQ = useForumReplies(postId || null);
  const upvote = usePostUpvote();
  const replyUpvote = useReplyUpvote(postId);
  const markSolution = useMarkSolution(postId);
  const createReply = useCreateReply(postId);
  const deletePost = useDeletePost(postId);
  const updatePost = useUpdatePost(postId);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [replyTo, setReplyTo] = useState<ForumReplyItem | null>(null);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const post = postQ.data ?? null;
  const isOwner = !!post && post.userId === me.id;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)/community' as Href);
  };

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: insets.top + theme.spacing.two,
        paddingHorizontal: theme.spacing.four,
        paddingBottom: theme.spacing.two,
        gap: theme.spacing.two,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <IconButton
        icon={<ChevronLeft size={22} color={theme.colors.foreground} />}
        label="Back"
        variant="muted"
        onPress={goBack}
      />
      <Text variant="heading" style={{ flex: 1, textAlign: 'center' }}>
        Post
      </Text>
      {isOwner && !editing ? (
        <IconButton
          icon={<MoreHorizontal size={20} color={theme.colors.foreground} />}
          label="Post options"
          variant="muted"
          onPress={() => setMenuOpen(true)}
        />
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );

  if (!post) {
    const notFound = errorCode(postQ.error) === 'FORUM_POST_NOT_FOUND' || errorCode(postQ.error) === 'NOT_FOUND';
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {header}
        {postQ.isError && notFound ? (
          <EmptyState
            title="This post is no longer available"
            description="It may have been deleted by its author."
            actionLabel="Back to Community"
            onAction={goBack}
          />
        ) : postQ.isError ? (
          <ErrorState
            title="Couldn’t load this post"
            description="Check your connection and try again."
            onRetry={() => void postQ.refetch()}
          />
        ) : (
          <View style={{ padding: theme.spacing.four, gap: theme.spacing.three }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
              <Skeleton width={44} height={44} radius={22} />
              <View style={{ flex: 1, gap: theme.spacing.one }}>
                <Skeleton width="45%" height={14} />
                <Skeleton width="30%" height={12} />
              </View>
            </View>
            <Skeleton width="90%" height={28} />
            <Skeleton width="70%" height={28} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="80%" height={14} />
            <Skeleton width="100%" height={180} radius={14} />
          </View>
        )}
      </View>
    );
  }

  const threads = buildThreads(repliesQ.data ?? []);

  const onUpvotePost = () =>
    upvote.mutate(post.id, { onError: () => showToast('Couldn’t update your vote. Try again.', 'error') });

  const onUpvoteReply = (replyId: string) =>
    replyUpvote.mutate(replyId, { onError: () => showToast('Couldn’t update your vote. Try again.', 'error') });

  const onMarkSolution = (reply: ForumReplyItem) =>
    markSolution.mutate(reply.id, {
      onSuccess: () => showToast('Marked as the solution', 'success'),
      onError: (e) => showToast(friendlyError(errorCode(e)), 'error'),
    });

  const onSend = () => {
    const parsed = replySchema.safeParse({ content: draft });
    if (!parsed.success) {
      setDraftError(parsed.error.issues[0]?.message ?? 'Check your reply');
      return;
    }
    setDraftError(null);
    createReply.mutate(
      { content: parsed.data.content, parentId: replyTo?.id ?? null },
      {
        onSuccess: () => {
          setDraft('');
          setReplyTo(null);
        },
        onError: (e) => showToast(friendlyError(errorCode(e)), 'error'),
      },
    );
  };

  const confirmDelete = () =>
    Alert.alert('Delete this post?', 'The post and all of its replies will be removed. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deletePost.mutate(undefined, {
            onSuccess: () => {
              showToast('Post deleted', 'success');
              goBack();
            },
            onError: (e) => showToast(friendlyError(errorCode(e)), 'error'),
          }),
      },
    ]);

  const repliesTotal = repliesQ.data?.length ?? post.repliesCount;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior="padding">
      {header}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ padding: theme.spacing.four, gap: theme.spacing.four, paddingBottom: theme.spacing.eight }}
      >
        <PostHeader post={post} theme={theme} />

        {editing ? (
          <PostEditor
            post={post}
            saving={updatePost.isPending}
            theme={theme}
            onCancel={() => setEditing(false)}
            onSave={(values) =>
              updatePost.mutate(values, {
                onSuccess: () => {
                  setEditing(false);
                  showToast('Post updated', 'success');
                },
                onError: (e) => showToast(friendlyError(errorCode(e)), 'error'),
              })
            }
          />
        ) : (
          <>
            <Text variant="title" accessibilityRole="header">
              {post.title}
            </Text>
            <Markdown value={post.content} />
          </>
        )}

        {post.imageUrl ? <PostImage uri={post.imageUrl} label={`Image attached to ${post.title}`} /> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
          <UpvotePill count={post.upvotesCount} active={post.hasUpvoted} onPress={onUpvotePost} />
          <ReplyCountPill count={repliesTotal} />
          <View style={{ flex: 1 }} />
          {post.isSolved ? <Badge label="Solved" tone="success" /> : null}
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors.border }} />

        <Text variant="heading">
          {repliesTotal === 0 ? 'Replies' : `${repliesTotal} ${repliesTotal === 1 ? 'reply' : 'replies'}`}
        </Text>

        {repliesQ.isPending ? (
          <View style={{ gap: theme.spacing.four }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.three }}>
                <Skeleton width={32} height={32} radius={16} />
                <View style={{ flex: 1, gap: theme.spacing.two }}>
                  <Skeleton width="40%" height={12} />
                  <Skeleton width="100%" height={14} />
                  <Skeleton width="70%" height={14} />
                </View>
              </View>
            ))}
          </View>
        ) : repliesQ.isError ? (
          <ErrorState
            title="Couldn’t load replies"
            description="Check your connection and try again."
            onRetry={() => void repliesQ.refetch()}
          />
        ) : threads.length === 0 ? (
          <EmptyState
            icon={<MessageCircle size={28} color={theme.colors.mutedForeground} />}
            title="No replies yet"
            description="Be the first to help out."
          />
        ) : (
          <View style={{ gap: theme.spacing.five }}>
            {threads.map(({ reply, children }) => (
              <View key={reply.id} style={{ gap: theme.spacing.three }}>
                <ReplyRow
                  reply={reply}
                  isPostAuthor={reply.userId === post.userId}
                  canMarkSolution={isOwner && !reply.isSolution}
                  marking={markSolution.isPending && markSolution.variables === reply.id}
                  onUpvote={() => onUpvoteReply(reply.id)}
                  onReply={() => setReplyTo(reply)}
                  onMarkSolution={() => onMarkSolution(reply)}
                  theme={theme}
                />
                {children.length > 0 ? (
                  <View
                    style={{
                      marginLeft: theme.spacing.four,
                      paddingLeft: theme.spacing.three,
                      borderLeftWidth: 2,
                      borderLeftColor: theme.colors.border,
                      gap: theme.spacing.four,
                    }}
                  >
                    {children.map((child) => (
                      <ReplyRow
                        key={child.id}
                        reply={child}
                        nested
                        isPostAuthor={child.userId === post.userId}
                        canMarkSolution={isOwner && !child.isSolution}
                        marking={markSolution.isPending && markSolution.variables === child.id}
                        onUpvote={() => onUpvoteReply(child.id)}
                        onReply={() => setReplyTo(reply)}
                        onMarkSolution={() => onMarkSolution(child)}
                        theme={theme}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Composer */}
      <View
        style={{
          paddingHorizontal: theme.spacing.four,
          paddingTop: theme.spacing.three,
          paddingBottom: Math.max(insets.bottom, theme.spacing.three),
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
          gap: theme.spacing.two,
        }}
      >
        {replyTo ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
              Replying to {replyTo.author.name}
            </Text>
            <IconButton
              icon={<X size={16} color={theme.colors.mutedForeground} />}
              label="Cancel reply"
              size={32}
              onPress={() => setReplyTo(null)}
            />
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.two }}>
          <TextInput
            value={draft}
            onChangeText={(t) => {
              setDraft(t);
              if (draftError) setDraftError(null);
            }}
            placeholder={replyTo ? `Reply to ${replyTo.author.name}…` : 'Write a reply…'}
            placeholderTextColor={theme.colors.mutedForeground}
            accessibilityLabel="Write a reply"
            multiline
            maxLength={REPLY_MAX}
            style={{
              flex: 1,
              minHeight: 48,
              maxHeight: 120,
              paddingHorizontal: theme.spacing.four,
              paddingTop: theme.spacing.three,
              paddingBottom: theme.spacing.three,
              borderRadius: theme.radius.xl + 10,
              borderWidth: 1,
              borderColor: draftError ? theme.colors.destructive : theme.colors.border,
              backgroundColor: theme.colors.muted,
              color: theme.colors.foreground,
              fontFamily: theme.fonts.regular,
              fontSize: theme.typography.body.fontSize,
            }}
          />
          <Pressable
            onPress={onSend}
            disabled={createReply.isPending || draft.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel="Send reply"
            accessibilityState={{ disabled: createReply.isPending || draft.trim().length === 0, busy: createReply.isPending }}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primary,
              opacity: createReply.isPending || draft.trim().length === 0 ? 0.4 : pressed ? 0.8 : 1,
            })}
          >
            <ArrowUp size={22} color={theme.colors.primaryForeground} />
          </Pressable>
        </View>
        {draftError ? (
          <Text variant="caption" tone="destructive">
            {draftError}
          </Text>
        ) : null}
      </View>

      <OptionSheet
        visible={menuOpen}
        title="Your post"
        options={[
          {
            value: 'edit',
            label: 'Edit post',
            icon: <Pencil size={18} color={theme.colors.foreground} />,
          },
          {
            value: 'delete',
            label: 'Delete post',
            destructive: true,
            icon: <Trash2 size={18} color={theme.colors.destructive} />,
          },
        ]}
        onSelect={(value) => {
          setMenuOpen(false);
          if (value === 'edit') setEditing(true);
          else confirmDelete();
        }}
        onClose={() => setMenuOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

function PostHeader({ post, theme }: { post: ForumPostItem; theme: Theme }) {
  const name = post.author?.name ?? 'Deleted user';
  const staff = roleBadge(post.author?.role);
  const meta = [timeAgo(post.createdAt), post.updatedAt !== post.createdAt ? 'edited' : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.three }}>
      <Avatar uri={post.author?.avatarUrl} name={name} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.two }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </Text>
          {staff ? <Badge label={staff} /> : null}
        </View>
        <Text variant="caption" tone="muted">
          {meta}
        </Text>
        {post.course ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.one }}>
            <BookOpen size={12} color={theme.colors.mutedForeground} />
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
              {post.lesson ? `${post.course.title} · ${post.lesson.title}` : post.course.title}
            </Text>
          </View>
        ) : null}
      </View>
      <CategoryTag category={post.category} />
    </View>
  );
}

function PostEditor({
  post,
  saving,
  theme,
  onCancel,
  onSave,
}: {
  post: ForumPostItem;
  saving: boolean;
  theme: Theme;
  onCancel: () => void;
  onSave: (values: EditPostForm) => void;
}) {
  const { control, handleSubmit } = useForm<EditPostForm>({
    resolver: zodResolver(editPostSchema),
    defaultValues: { title: post.title, content: post.content },
  });
  const inputStyle = {
    padding: theme.spacing.three,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    backgroundColor: theme.colors.muted,
    color: theme.colors.foreground,
    fontFamily: theme.fonts.regular,
  };
  return (
    <View style={{ gap: theme.spacing.three }}>
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <View style={{ gap: theme.spacing.one }}>
            <Text variant="label" tone="muted">
              Title
            </Text>
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              maxLength={TITLE_MAX}
              multiline
              accessibilityLabel="Title"
              style={{
                ...inputStyle,
                borderColor: fieldState.error ? theme.colors.destructive : theme.colors.border,
                fontFamily: theme.fonts.semibold,
                fontSize: theme.typography.heading.fontSize,
                lineHeight: theme.typography.heading.lineHeight,
              }}
            />
            {fieldState.error ? (
              <Text variant="caption" tone="destructive">
                {fieldState.error.message}
              </Text>
            ) : null}
          </View>
        )}
      />
      <Controller
        control={control}
        name="content"
        render={({ field, fieldState }) => (
          <View style={{ gap: theme.spacing.one }}>
            <Text variant="label" tone="muted">
              Content
            </Text>
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Content"
              style={{
                ...inputStyle,
                minHeight: 160,
                borderColor: fieldState.error ? theme.colors.destructive : theme.colors.border,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            />
            {fieldState.error ? (
              <Text variant="caption" tone="destructive">
                {fieldState.error.message}
              </Text>
            ) : null}
          </View>
        )}
      />
      <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>
        <Button label="Cancel" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={onCancel} />
        <Button
          label="Save"
          loading={saving}
          fullWidth={false}
          style={{ flex: 1 }}
          onPress={handleSubmit((v) => onSave({ title: v.title.trim(), content: v.content.trim() }))}
        />
      </View>
    </View>
  );
}

function ReplyRow({
  reply,
  nested,
  isPostAuthor,
  canMarkSolution,
  marking,
  onUpvote,
  onReply,
  onMarkSolution,
  theme,
}: {
  reply: ForumReplyItem;
  nested?: boolean;
  isPostAuthor: boolean;
  canMarkSolution: boolean;
  marking: boolean;
  onUpvote: () => void;
  onReply: () => void;
  onMarkSolution: () => void;
  theme: Theme;
}) {
  const staff = roleBadge(reply.author.role);
  return (
    <View
      style={[
        { flexDirection: 'row', gap: theme.spacing.three },
        reply.isSolution && {
          padding: theme.spacing.three,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.success,
          backgroundColor: theme.colors.muted,
        },
      ]}
    >
      <Avatar uri={reply.author.avatarUrl} name={reply.author.name} size={nested ? 28 : 32} />
      <View style={{ flex: 1, gap: theme.spacing.one }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.two }}>
          <Text variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
            {reply.author.name}
          </Text>
          {staff ? <Badge label={staff} /> : isPostAuthor ? <Badge label="Author" /> : null}
          <Text variant="caption" tone="muted">
            {timeAgo(reply.createdAt)}
          </Text>
          {reply.isSolution ? (
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
                Solution
              </Text>
            </View>
          ) : null}
        </View>
        <Markdown value={reply.content} compact />
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.two }}>
          <UpvotePill count={reply.upvotesCount} active={reply.hasUpvoted} onPress={onUpvote} small />
          <Pressable
            onPress={onReply}
            accessibilityRole="button"
            accessibilityLabel={`Reply to ${reply.author.name}`}
            hitSlop={6}
            style={{ minHeight: 32, justifyContent: 'center', paddingHorizontal: theme.spacing.two }}
          >
            <Text variant="label" tone="muted">
              Reply
            </Text>
          </Pressable>
          {canMarkSolution ? (
            <Pressable
              onPress={onMarkSolution}
              disabled={marking}
              accessibilityRole="button"
              accessibilityLabel={`Mark ${reply.author.name}’s reply as the solution`}
              hitSlop={6}
              style={{
                minHeight: 32,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.one,
                paddingHorizontal: theme.spacing.two,
                opacity: marking ? 0.5 : 1,
              }}
            >
              <CircleCheck size={14} color={theme.colors.success} />
              <Text variant="label" tone="success">
                Mark as solution
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
