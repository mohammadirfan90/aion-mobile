/**
 * S09 — My Learning.
 *
 * Lists every course the student is enrolled in, split into In progress vs.
 * Completed by the `isCompleted` flag on each row. Data comes from
 * `GET /users/me/learning-summary` (API §12) through `useMyLearning()`
 * (D-07: no `fetch` in this file).
 *
 * Layout (docs/design/S09-my-learning.png):
 *   1. Brand bar: avatar (→ Profile), "Aion" wordmark, search and filter
 *      icons.
 *   2. "My Learning" title + "{n} active courses in this term" subtitle
 *      (active = in-progress; this is the row count under the In progress
 *      segment).
 *   3. `SegmentedControl` (In progress / Completed).
 *   4. Vertical list of cards. Each card has a thumbnail (left), an
 *      optional category strip above the title (first tag, when there is
 *      one), the course title, "x / y lessons · Enrolled {date}" (or
 *      "Completed {date}" for finished courses), and either a progress
 *      bar with % on the right (in progress) or a "Completed" badge, a
 *      "100% Completed" line, and a **Certificate** button (→ S28).
 *   5. Empty states: no enrollments at all → a friendly "Start your first
 *      course" card (→ Explore tab); the other segment empty → a short
 *      hint to switch segments.
 *
 * Tapping a course → S11 (Curriculum). The Certificate button also opens
 * S28 for that course.
 */
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View, type ListRenderItem } from 'react-native';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Award, CheckCircle2, ListFilter, MoreHorizontal, Search } from 'lucide-react-native';

import logoLight from '@/assets/brand/logo.png';
import logoDark from '@/assets/brand/logo-dark.png';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useTheme, type Theme } from '@/theme';
import { mockAuth } from '@/mocks/auth-store';
import { useMyLearning } from '@/features/learning/hooks';
import { listCourses } from '@/mocks/fixtures/courses';
import type { MyLearningRow } from '@/api/types';

type Segment = 'inProgress' | 'completed';
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'inProgress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const THUMB_SIZE = 100;

function formatEnrolledDate(iso: string, isCompleted: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const verb = isCompleted ? 'Completed' : 'Enrolled';
  return `${verb} ${month} ${day}`;
}

function firstTagLabel(row: MyLearningRow): string | null {
  // The card's category strip is a thin decorative label above the title.
  // It is not in the SCREENS spec; we render the first course tag (when
  // present) so the strip has real content. If we ever add a real
  // `category` field, swap it in here.
  const course = listCourses().find((c) => c.id === row.id);
  const tag = course?.tags?.[0];
  return tag ? tag.toUpperCase() : null;
}

function CourseRow({
  row,
  onPress,
  onCertificate,
  theme,
}: {
  row: MyLearningRow;
  onPress: () => void;
  onCertificate: () => void;
  theme: Theme;
}) {
  const tagLabel = firstTagLabel(row);
  const dateLabel = formatEnrolledDate(row.enrolledAt, row.isCompleted);
  const thumbBg = theme.colors.muted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}, ${row.completedLessons} of ${row.totalLessons} lessons, ${row.percent}%${
        row.isCompleted ? ', completed' : ''
      }`}
    >
      <Card padded={false}>
        <View
          style={{
            flexDirection: 'row',
            padding: theme.spacing.four,
            gap: theme.spacing.four,
          }}
        >
          {/* Thumbnail */}
          <View
            style={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: theme.radius.md,
              overflow: 'hidden',
              backgroundColor: thumbBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel={row.thumbnail ? `${row.title} thumbnail` : undefined}
          >
            {row.thumbnail ? (
              <Image
                source={{ uri: row.thumbnail }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Text variant="tiny" tone="muted">
                {row.title.slice(0, 2).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Text block */}
          <View style={{ flex: 1, gap: 4 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {tagLabel ? (
                <Text variant="tiny" tone="muted" style={{ letterSpacing: 0.5 }}>
                  {tagLabel}
                </Text>
              ) : (
                <View />
              )}
              {row.isCompleted ? (
                <Badge label="● Completed" tone="neutral" />
              ) : (
                <IconButton
                  icon={<MoreHorizontal size={18} color={theme.colors.mutedForeground} />}
                  label="More"
                  size={28}
                  variant="plain"
                />
              )}
            </View>

            <Text variant="bodyStrong" weight="bold" numberOfLines={2}>
              {row.title}
            </Text>

            <Text variant="caption" tone="muted">
              {row.completedLessons} / {row.totalLessons} lessons · {dateLabel}
            </Text>
          </View>
        </View>

        {/* Footer: progress bar (in progress) or completed line + Certificate */}
        {row.isCompleted ? (
          <View
            style={{
              paddingHorizontal: theme.spacing.four,
              paddingTop: theme.spacing.two,
              paddingBottom: theme.spacing.four,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.three,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} color={theme.colors.success} />
              <Text variant="bodyStrong">100% Completed</Text>
            </View>
            <Button
              label="Certificate"
              variant="secondary"
              size="sm"
              fullWidth={false}
              iconLeft={<Award size={16} color={theme.colors.foreground} />}
              onPress={onCertificate}
            />
          </View>
        ) : (
          <View
            style={{
              paddingHorizontal: theme.spacing.four,
              paddingBottom: theme.spacing.four,
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.three,
            }}
          >
            <View style={{ flex: 1 }}>
              <ProgressBar value={row.percent / 100} />
            </View>
            <Text variant="bodyStrong">{row.percent}%</Text>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

function CourseRowSkeleton({ theme }: { theme: Theme }) {
  return (
    <Card padded={false}>
      <View
        style={{
          flexDirection: 'row',
          padding: theme.spacing.four,
          gap: theme.spacing.four,
        }}
      >
        <Skeleton width={THUMB_SIZE} height={THUMB_SIZE} radius={theme.radius.md} />
        <View style={{ flex: 1, gap: theme.spacing.two }}>
          <Skeleton width="40%" />
          <Skeleton width="85%" />
          <Skeleton width="60%" />
        </View>
      </View>
      <View
        style={{
          paddingHorizontal: theme.spacing.four,
          paddingBottom: theme.spacing.four,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.three,
        }}
      >
        <View style={{ flex: 1 }}>
          <Skeleton height={6} radius={3} />
        </View>
        <Skeleton width={32} height={14} />
      </View>
    </Card>
  );
}

export function LearningScreen() {
  const theme = useTheme();
  const [segment, setSegment] = useState<Segment>('inProgress');
  const query = useMyLearning();
  const profile = mockAuth.getProfile();

  const { inProgress, completed } = useMemo(() => {
    const all = query.data ?? [];
    return {
      inProgress: all.filter((r) => !r.isCompleted),
      completed: all.filter((r) => r.isCompleted),
    };
  }, [query.data]);

  const list = segment === 'inProgress' ? inProgress : completed;

  const onRefresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const onOpenCourse = useCallback((courseId: string) => {
    router.push(`/(app)/course/${courseId}/curriculum` as Href);
  }, []);

  const onOpenCertificate = useCallback((courseId: string) => {
    router.push(`/(app)/course/${courseId}/certificate` as Href);
  }, []);

  const renderItem: ListRenderItem<MyLearningRow> = ({ item }) => (
    <CourseRow
      row={item}
      theme={theme}
      onPress={() => onOpenCourse(item.id)}
      onCertificate={() => onOpenCertificate(item.id)}
    />
  );

  const isInitialLoading = query.isLoading && !query.data;
  const isError = query.isError && !query.data;
  const isEmptyOverall =
    !isInitialLoading && !isError && inProgress.length === 0 && completed.length === 0;

  const headerSubtitle = isError
    ? ' '
    : isInitialLoading
      ? 'Loading your courses…'
      : `${inProgress.length} active course${inProgress.length === 1 ? '' : 's'} in this term`;

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
          title="Couldn’t load your courses"
          description="Check your connection and try again."
          onRetry={onRefresh}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={isInitialLoading ? [] : list}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.four,
          paddingTop: theme.spacing.four,
          paddingBottom: theme.spacing.eight,
          gap: theme.spacing.four,
        }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !isInitialLoading}
            onRefresh={onRefresh}
            tintColor={theme.colors.mutedForeground}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.four }}>
            {/* Brand bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Pressable
                onPress={() => router.push('/(app)/(tabs)/profile' as Href)}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}
              >
                <Avatar uri={profile?.avatar} name={profile?.fullName} size={36} />
                <Image
                  source={theme.mode === 'dark' ? logoDark : logoLight}
                  style={{ width: 64, height: 20 }}
                  contentFit="contain"
                  accessibilityLabel="Aion"
                />
              </Pressable>
              <View style={{ flexDirection: 'row', gap: theme.spacing.one }}>
                <IconButton
                  icon={<Search size={20} color={theme.colors.foreground} />}
                  label="Search my courses"
                />
                <IconButton
                  icon={<ListFilter size={20} color={theme.colors.foreground} />}
                  label="Filter"
                />
              </View>
            </View>

            {/* Title + subtitle */}
            <View style={{ gap: 4 }}>
              <Text variant="display" weight="bold">
                My Learning
              </Text>
              <Text variant="caption" tone="muted">
                {headerSubtitle}
              </Text>
            </View>

            {/* Segmented control */}
            <SegmentedControl options={SEGMENTS} value={segment} onChange={setSegment} />
          </View>
        }
        ListEmptyComponent={
          isInitialLoading ? (
            <View style={{ gap: theme.spacing.four }}>
              <CourseRowSkeleton theme={theme} />
              <CourseRowSkeleton theme={theme} />
            </View>
          ) : isEmptyOverall ? (
            <EmptyState
              title="Start your first course"
              description="Browse the catalog to find something you’d like to learn."
              actionLabel="Explore courses"
              onAction={() => router.push('/(app)/(tabs)/explore' as Href)}
            />
          ) : (
            <EmptyState
              title={segment === 'inProgress' ? 'Nothing in progress' : 'No completed courses yet'}
              description={
                segment === 'inProgress'
                  ? 'You haven’t started any courses yet. Pick one from the Completed tab or explore the catalog.'
                  : 'Finish a course to see your certificate here.'
              }
            />
          )
        }
      />
    </View>
  );
}
