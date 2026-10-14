/**
 * S08 — Explore (course catalog).
 *
 * Public catalog of every published course, filtered on the device. The API
 * has no search/level/price query params, so everything below the SearchBar
 * is client-side (SCREENS §S08, API §3).
 *
 * Layout (docs/design/S08-explore.png):
 *   1. Brand bar: "Aion" wordmark (small) + a tiny "Ask Aion" AI-tutor pill
 *      (kept consistent with the Home brand bar).
 *   2. "Explore" title.
 *   3. SearchBar — 300 ms debounce, searches title + description + tags.
 *   4. Level ChipGroup (All / Beginner / Intermediate / Advanced).
 *   5. Price ChipGroup (All / Free / Paid).
 *   6. Vertical list of course cards: thumbnail (with optional level badge
 *      and "Enrolled" badge), title (2 lines), short description, price (or
 *      "Free") and a trailing chevron.
 *   7. Empty state when filters return nothing — "No courses match" with a
 *      "Clear filters" action.
 *
 * Tapping a card goes to S10 (course detail). Data comes only from feature
 * hooks (D-07); no `fetch` in this file.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View, type ListRenderItem } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight, Sparkles } from 'lucide-react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ChipGroup } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SearchBar } from '@/components/ui/SearchBar';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useTheme, type Theme } from '@/theme';
import { useCourses, useMyEnrollments } from '@/features/catalog/hooks';
import { formatCoursePrice, isFreeCourse, levelLabel } from '@/lib/course';
import type { Course } from '@/api/types';

const LEVEL_OPTIONS = ['All', 'Beginner', 'Intermediate', 'Advanced'] as const;
type LevelFilter = (typeof LEVEL_OPTIONS)[number];

const PRICE_OPTIONS = ['All', 'Free', 'Paid'] as const;
type PriceFilter = (typeof PRICE_OPTIONS)[number];

const SEARCH_DEBOUNCE_MS = 300;

function filterMatchesLevel(course: Course, filter: LevelFilter): boolean {
  if (filter === 'All') return true;
  return levelLabel(course.level) === filter;
}

function filterMatchesPrice(course: Course, filter: PriceFilter): boolean {
  if (filter === 'All') return true;
  if (filter === 'Free') return isFreeCourse(course);
  return !isFreeCourse(course);
}

function searchMatches(course: Course, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (course.title.toLowerCase().includes(needle)) return true;
  if (course.description?.toLowerCase().includes(needle)) return true;
  if (course.tags?.some((t) => t.toLowerCase().includes(needle))) return true;
  return false;
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function CourseCard({
  course,
  isEnrolled,
  onPress,
  theme,
}: {
  course: Course;
  isEnrolled: boolean;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${course.title}${isEnrolled ? ', enrolled' : ''}`}
    >
      <Card padded={false} style={{ overflow: 'hidden' }}>
        <View
          accessibilityLabel={course.thumbnail ? `${course.title} thumbnail` : undefined}
          style={{
            height: 180,
            backgroundColor: theme.colors.muted,
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: theme.spacing.two,
              left: theme.spacing.two,
              flexDirection: 'row',
              gap: theme.spacing.two,
            }}
          >
            {course.level ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.two,
                  paddingVertical: 4,
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colors.card,
                }}
              >
                <Text variant="tiny">{levelLabel(course.level)}</Text>
              </View>
            ) : null}
            {isEnrolled ? <Badge label="✓ Enrolled" tone="primary" /> : null}
          </View>
        </View>
        <View
          style={{
            padding: theme.spacing.four,
            gap: theme.spacing.two,
          }}
        >
          <Text variant="bodyStrong" numberOfLines={2}>
            {course.title}
          </Text>
          {course.description ? (
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {course.description}
            </Text>
          ) : null}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: theme.spacing.two,
            }}
          >
            <Text variant="bodyStrong">{formatCoursePrice(course)}</Text>
            <ChevronRight size={20} color={theme.colors.mutedForeground} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export function ExploreScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<LevelFilter>('All');
  const [price, setPrice] = useState<PriceFilter>('All');
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const coursesQ = useCourses();
  const enrollmentsQ = useMyEnrollments();

  const enrolledIds = useMemo(() => {
    const set = new Set<string>();
    enrollmentsQ.data?.forEach((e) => set.add(e.courseId));
    return set;
  }, [enrollmentsQ.data]);

  const filtered = useMemo(() => {
    if (!coursesQ.data) return [];
    return coursesQ.data.filter(
      (c) =>
        searchMatches(c, debouncedQuery) &&
        filterMatchesLevel(c, level) &&
        filterMatchesPrice(c, price),
    );
  }, [coursesQ.data, debouncedQuery, level, price]);

  const onClearFilters = useCallback(() => {
    setQuery('');
    setLevel('All');
    setPrice('All');
  }, []);

  const onRefresh = useCallback(() => {
    void coursesQ.refetch();
    void enrollmentsQ.refetch();
  }, [coursesQ, enrollmentsQ]);

  const isInitialLoading = coursesQ.isLoading && !coursesQ.data;
  const isError = coursesQ.isError && !coursesQ.data;

  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: theme.spacing.twelve,
        }}
      >
        <ErrorState
          title="Couldn’t load the catalog"
          description="Check your connection and try again."
          onRetry={onRefresh}
        />
      </View>
    );
  }

  const renderCard: ListRenderItem<Course> = ({ item }) => (
    <CourseCard
      course={item}
      isEnrolled={enrolledIds.has(item.id)}
      theme={theme}
      onPress={() => router.push(`/(app)/course/${item.id}` as Href)}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        renderItem={renderCard}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.four,
          paddingTop: theme.spacing.three,
          paddingBottom: theme.spacing.eight,
          gap: theme.spacing.four,
        }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.four, marginBottom: theme.spacing.two }}>
            {/* Brand bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <BrandLogo height={24} />
              <Pressable
                onPress={() => router.push('/tutor' as Href)}
                accessibilityRole="button"
                accessibilityLabel="Ask Aion"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.two,
                  paddingHorizontal: theme.spacing.three,
                  paddingVertical: theme.spacing.two,
                  borderRadius: theme.radius.full,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Sparkles size={16} color={theme.colors.foreground} />
                <Text variant="label">Ask Aion</Text>
              </Pressable>
            </View>

            {/* Page title */}
            <Text variant="display" weight="bold">
              Explore
            </Text>

            {/* Search */}
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search courses" />

            {/* Level filter */}
            <View style={{ gap: theme.spacing.two }}>
              <Text variant="label" tone="muted">
                Level
              </Text>
              <ChipGroup options={LEVEL_OPTIONS} value={level} onChange={setLevel} />
            </View>

            {/* Price filter */}
            <View style={{ gap: theme.spacing.two }}>
              <Text variant="label" tone="muted">
                Price
              </Text>
              <ChipGroup options={PRICE_OPTIONS} value={price} onChange={setPrice} />
            </View>

            {coursesQ.isFetching ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                accessibilityLabel="Loading courses"
              >
                <ActivityIndicator size="small" color={theme.colors.mutedForeground} />
                <Text variant="caption" tone="muted">
                  Refreshing…
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isInitialLoading ? (
            <View style={{ gap: theme.spacing.four }}>
              <Card padded={false}>
                <Skeleton height={180} radius={0} />
                <View style={{ padding: theme.spacing.four, gap: theme.spacing.two }}>
                  <Skeleton width="70%" />
                  <SkeletonGroup count={2} />
                </View>
              </Card>
              <Card padded={false}>
                <Skeleton height={180} radius={0} />
                <View style={{ padding: theme.spacing.four, gap: theme.spacing.two }}>
                  <Skeleton width="60%" />
                  <SkeletonGroup count={2} />
                </View>
              </Card>
            </View>
          ) : (
            <EmptyState
              title="No courses match"
              description="Try a different search or clear the filters to see everything."
              actionLabel="Clear filters"
              onAction={onClearFilters}
            />
          )
        }
        refreshing={coursesQ.isFetching || enrollmentsQ.isFetching}
        onRefresh={onRefresh}
      />
    </View>
  );
}
