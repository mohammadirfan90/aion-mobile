/**
 * S19 — Community. Matches `docs/design/S19-community.png`.
 *
 *   1. Brand bar (avatar + Aion logo, "Ask Aion" pill), "Community" title.
 *   2. Stats strip: posts, replies, solved (API §10).
 *   3. SearchBar (300 ms debounce), category chips, and a sort menu
 *      (Latest / Recent activity / Most upvoted / Most replies). All three
 *      combine into one server query.
 *   4. The feed: pinned posts first (the API sorts them), infinite scroll on
 *      `page`/`total`, pull-to-refresh. Upvotes toggle optimistically.
 *   5. A floating New post button (→ S21).
 *
 * Not built from the design: the bookmark icon (no saved-posts endpoint).
 */
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View, type ListRenderItem } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, MessagesSquare, Plus, SearchX, Sparkles } from 'lucide-react-native';

import type { ForumCategoryValue, ForumPostItem, ForumStats } from '@/api/types';
import { BrandLogo } from '@/components/BrandLogo';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SearchBar } from '@/components/ui/SearchBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { useTheme } from '@/theme';

import { OptionSheet } from '../components/OptionSheet';
import { PostCard, PostCardSkeleton } from '../components/PostCard';
import { CATEGORY_LABELS, compactCount, SORT_LABELS } from '../format';
import {
  useCurrentUser,
  useForumFeed,
  useForumStats,
  usePostUpvote,
  type ForumFilters,
} from '../hooks';
import { FORUM_CATEGORIES } from '../schemas';

type CategoryFilter = ForumCategoryValue | 'all';
type SortOption = keyof typeof SORT_LABELS;

const CATEGORY_FILTERS: readonly CategoryFilter[] = ['all', ...FORUM_CATEGORIES];
const SORT_OPTIONS = (Object.keys(SORT_LABELS) as SortOption[]).map((value) => ({
  value,
  label: SORT_LABELS[value],
}));

export function CommunityScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const me = useCurrentUser();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sort, setSort] = useState<SortOption>('latest');
  const [sortOpen, setSortOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters: ForumFilters = { search, category, sort };
  const feed = useForumFeed(filters);
  const stats = useForumStats();
  const upvote = usePostUpvote();

  const posts = feed.data?.posts ?? [];
  const isInitialLoading = feed.isPending;
  const hasFilters = search !== '' || category !== 'all';

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([feed.refetch(), stats.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const onEndReached = () => {
    if (feed.hasNextPage && !feed.isFetchingNextPage && !feed.isError) void feed.fetchNextPage();
  };

  const onUpvote = (postId: string) =>
    upvote.mutate(postId, {
      onError: () => showToast('Couldn’t update your vote. Try again.', 'error'),
    });

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategory('all');
  };

  const renderItem: ListRenderItem<ForumPostItem> = ({ item }) => (
    <PostCard
      post={item}
      onPress={() => router.push(`/(app)/forum/${item.id}` as Href)}
      onUpvote={() => onUpvote(item.id)}
    />
  );

  const header = (
    <View style={{ gap: theme.spacing.four, paddingBottom: theme.spacing.one }}>
      {/* Brand bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => router.push('/(app)/(tabs)/profile' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}
        >
          <Avatar uri={me.avatarUrl} name={me.name} size={36} />
          <BrandLogo height={20} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/tutor' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Ask Aion"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.two,
            minHeight: 40,
            paddingHorizontal: theme.spacing.three,
            borderRadius: theme.radius.full,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Sparkles size={16} color={theme.colors.foreground} />
          <Text variant="label">Ask Aion</Text>
        </Pressable>
      </View>

      <View style={{ gap: theme.spacing.one }}>
        <Text variant="display" accessibilityRole="header">
          Community
        </Text>
        <Text tone="muted">Ask questions, share your work and help other learners.</Text>
      </View>

      <StatsStrip stats={stats.data} loading={stats.isPending} />

      <SearchBar value={searchInput} onChangeText={setSearchInput} placeholder="Search discussions" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: theme.spacing.two, paddingRight: theme.spacing.two }}
        >
          {CATEGORY_FILTERS.map((c) => (
            <Chip
              key={c}
              label={c === 'all' ? 'All' : CATEGORY_LABELS[c]}
              selected={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </ScrollView>
        <Pressable
          onPress={() => setSortOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Sort: ${SORT_LABELS[sort]}`}
          accessibilityHint="Opens sort options"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.one,
            minHeight: 36,
            paddingHorizontal: theme.spacing.three,
            borderRadius: theme.radius.full,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text variant="label" tone="muted" numberOfLines={1}>
            {SORT_LABELS[sort]}
          </Text>
          <ChevronDown size={16} color={theme.colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );

  const empty = isInitialLoading ? (
    <View style={{ gap: theme.spacing.four }}>
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </View>
  ) : feed.isError ? (
    <ErrorState
      title="Couldn’t load discussions"
      description="Check your connection and try again."
      onRetry={() => void feed.refetch()}
    />
  ) : hasFilters ? (
    <EmptyState
      icon={<SearchX size={32} color={theme.colors.mutedForeground} />}
      title="No posts match"
      description="Try a different search or category."
      actionLabel="Clear filters"
      onAction={clearFilters}
    />
  ) : (
    <EmptyState
      icon={<MessagesSquare size={32} color={theme.colors.mutedForeground} />}
      title="No discussions yet"
      description="Be the first to ask a question or share something you built."
      actionLabel="New post"
      onAction={() => router.push('/(app)/forum/new' as Href)}
    />
  );

  const footer = feed.isFetchingNextPage ? (
    <PostCardSkeleton />
  ) : feed.isFetchNextPageError ? (
    <Pressable
      onPress={() => void feed.fetchNextPage()}
      accessibilityRole="button"
      style={{ alignItems: 'center', paddingVertical: theme.spacing.four }}
    >
      <Text variant="label" tone="destructive">
        Couldn’t load more. Tap to retry.
      </Text>
    </Pressable>
  ) : posts.length > 0 && !feed.hasNextPage ? (
    <Text variant="caption" tone="muted" style={{ textAlign: 'center', paddingVertical: theme.spacing.two }}>
      You’re all caught up
    </Text>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={isInitialLoading ? [] : posts}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.three,
          paddingHorizontal: theme.spacing.four,
          // Leave room for the floating button.
          paddingBottom: theme.spacing.twelve + theme.spacing.ten,
          gap: theme.spacing.four,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={theme.colors.mutedForeground}
            progressViewOffset={insets.top}
          />
        }
      />

      <Pressable
        onPress={() => router.push('/(app)/forum/new' as Href)}
        accessibilityRole="button"
        accessibilityLabel="New post"
        style={({ pressed }) => ({
          position: 'absolute',
          right: theme.spacing.four,
          bottom: theme.spacing.four,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primary,
          opacity: pressed ? 0.85 : 1,
          elevation: 4,
          shadowColor: theme.colors.foreground,
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        })}
      >
        <Plus size={26} color={theme.colors.primaryForeground} />
      </Pressable>

      <OptionSheet
        visible={sortOpen}
        title="Sort by"
        options={SORT_OPTIONS}
        selected={sort}
        onSelect={(value) => {
          setSort(value);
          setSortOpen(false);
        }}
        onClose={() => setSortOpen(false)}
      />
    </View>
  );
}

function StatsStrip({ stats, loading }: { stats: ForumStats | undefined; loading: boolean }) {
  const theme = useTheme();
  const items = [
    { label: 'Posts', value: stats?.totalPosts },
    { label: 'Replies', value: stats?.totalReplies },
    { label: 'Solved', value: stats?.totalSolved, dot: true },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>
      {items.map((item) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={`${item.label}: ${item.value ?? 'loading'}`}
          style={{
            flex: 1,
            padding: theme.spacing.three,
            gap: theme.spacing.one,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          }}
        >
          <Text variant="tiny" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {item.label}
          </Text>
          {loading ? (
            <Skeleton width={48} height={24} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.one + 2 }}>
              <Text variant="title">{item.value === undefined ? '–' : compactCount(item.value)}</Text>
              {item.dot && item.value !== undefined ? (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.success }} />
              ) : null}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
