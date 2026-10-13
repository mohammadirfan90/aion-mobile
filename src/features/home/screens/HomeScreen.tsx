/**
 * S07 — Home screen.
 *
 * The single landing tab for signed-in students. Pulls three pieces of data
 * through feature hooks (D-07) and renders them against the
 * `docs/design/S07-home.png` design:
 *   1. Brand bar (wordmark + Ask Aion pill + avatar)
 *   2. Greeting ("Hi, {first name} 👋")
 *   3. Continue learning card (the in-progress course with the latest
 *      activity; opens the next lesson on Resume)
 *   4. Stats row (enrolled / lessons finished / completed)
 *   5. My courses carousel (enrolled)
 *   6. Explore more carousel (not yet enrolled)
 *
 * Handles loading, empty and error states per SPEC §7; the empty state for
 * "no enrollments" is a friendly "Start your first course" card pointing to
 * the Explore tab.
 */
import { useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  type ListRenderItem,
} from 'react-native';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { BookOpen, GraduationCap, Layers, Play, Search, Sparkles } from 'lucide-react-native';

import logoLight from '@/assets/brand/logo.png';
import logoDark from '@/assets/brand/logo-dark.png';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useTheme, type Theme } from '@/theme';
import { mockAuth } from '@/mocks/auth-store';
import { useExploreMore, useLearningSummary, useMyCourses } from '@/features/home/hooks';
import type { Course, LearningSummary } from '@/api/types';

const CARD_WIDTH = 220;
const GUTTER = 12;
const HORIZONTAL_PADDING = 16;

function capitalize(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

function formatPrice(course: Course): string {
  const p = course.pricingConfig;
  if (!p) return 'Free';
  if (p.type === 'free' || p.price === 0) return 'Free';
  return `$${(p.price / 100).toFixed(0)}`;
}

function StatCard({
  icon,
  value,
  label,
  theme,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  theme: Theme;
}) {
  return (
    <Card
      padded
      style={{
        flex: 1,
        gap: theme.spacing.two,
        alignItems: 'flex-start',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text variant="title" weight="bold">
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </Card>
  );
}

function CourseCarouselCard({
  course,
  onPress,
  progressPercent,
  badge,
  trailing,
  theme,
}: {
  course: Course;
  onPress: () => void;
  progressPercent?: number;
  badge?: string;
  trailing?: React.ReactNode;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ width: CARD_WIDTH, marginRight: GUTTER }}
    >
      <Card padded={false} style={{ overflow: 'hidden' }}>
        <View
          accessibilityLabel={course.thumbnail ? `${course.title} thumbnail` : undefined}
          style={{
            height: 110,
            backgroundColor: theme.colors.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {badge ? (
            <View
              style={{
                position: 'absolute',
                top: theme.spacing.two,
                left: theme.spacing.two,
                paddingHorizontal: theme.spacing.two,
                paddingVertical: 4,
                borderRadius: theme.radius.full,
                backgroundColor: theme.colors.card,
              }}
            >
              <Text variant="tiny">{badge}</Text>
            </View>
          ) : null}
          <Text tone="muted" variant="caption">
            {course.thumbnail ? '' : 'No image'}
          </Text>
        </View>
        <View style={{ padding: theme.spacing.three, gap: theme.spacing.two }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {course.title}
          </Text>
          {typeof progressPercent === 'number' ? (
            <View style={{ gap: 4 }}>
              <ProgressBar value={progressPercent / 100} height={4} />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="caption" tone="muted">
                  Progress
                </Text>
                <Text variant="caption" tone="muted">
                  {progressPercent}%
                </Text>
              </View>
            </View>
          ) : trailing ? (
            trailing
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

function ContinueLearningCard({
  summary,
  theme,
  onResume,
  onOpenCourse,
}: {
  summary: NonNullable<LearningSummary['continueLearning']>;
  theme: Theme;
  onResume: () => void;
  onOpenCourse: () => void;
}) {
  const { course, enrollment, nextLesson } = summary;
  return (
    <Pressable onPress={onOpenCourse} accessibilityRole="button">
      <Card padded={false} style={{ overflow: 'hidden' }}>
        <View
          style={{
            height: 150,
            backgroundColor: theme.colors.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: theme.spacing.three,
              left: theme.spacing.three,
              paddingHorizontal: theme.spacing.three,
              paddingVertical: 4,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.card,
            }}
          >
            <Text variant="tiny">{course.title}</Text>
          </View>
          <View
            style={{
              position: 'absolute',
              top: theme.spacing.three,
              right: theme.spacing.three,
            }}
          >
            <Badge label="In progress" tone="primary" />
          </View>
        </View>
        <View
          style={{
            padding: theme.spacing.four,
            gap: theme.spacing.three,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text variant="title" weight="bold" numberOfLines={2}>
              {course.title}
            </Text>
            {nextLesson ? (
              <Text tone="muted" variant="body">
                Next: {nextLesson.title}
              </Text>
            ) : null}
          </View>
          <View style={{ gap: 4 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text variant="caption" tone="muted">
                Progress
              </Text>
              <Text variant="caption" tone="muted">
                {enrollment.progressPercent}% complete
              </Text>
            </View>
            <ProgressBar value={enrollment.progressPercent / 100} height={4} />
          </View>
          <Button
            label="Resume"
            variant="primary"
            size="lg"
            fullWidth
            iconLeft={
              <Play
                size={16}
                color={theme.colors.primaryForeground}
                fill={theme.colors.primaryForeground}
              />
            }
            onPress={onResume}
          />
        </View>
      </Card>
    </Pressable>
  );
}

function Section({
  title,
  onSeeAll,
  theme,
  children,
}: {
  title: string;
  onSeeAll: () => void;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: theme.spacing.three }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text variant="heading" weight="bold">
          {title}
        </Text>
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="link"
          accessibilityLabel={`See all ${title}`}
          hitSlop={8}
        >
          <Text tone="muted" variant="label">
            See all
          </Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function HorizontalCards<T>({
  data,
  renderItem,
  keyExtractor,
}: {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
}) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: GUTTER }}
    />
  );
}

export function HomeScreen() {
  const theme = useTheme();
  const profile = mockAuth.getProfile();
  const firstName = profile?.firstName ?? 'there';

  const summaryQ = useLearningSummary();
  const myCoursesQ = useMyCourses();
  const excludeIds = useMemo(
    () => summaryQ.data?.enrolledCourses.map((c) => c.course.id) ?? [],
    [summaryQ.data],
  );
  const exploreQ = useExploreMore(excludeIds);

  const isRefreshing = summaryQ.isFetching || myCoursesQ.isFetching || exploreQ.isFetching;
  const onRefresh = useCallback(() => {
    void summaryQ.refetch();
    void myCoursesQ.refetch();
    void exploreQ.refetch();
  }, [summaryQ, myCoursesQ, exploreQ]);

  if (summaryQ.isError && !summaryQ.data) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: theme.spacing.twelve,
        }}
      >
        <ErrorState
          title="Couldn’t load your home"
          description="Check your connection and try again."
          onRetry={onRefresh}
        />
      </View>
    );
  }

  const summary = summaryQ.data ?? null;
  const myCourses = myCoursesQ.data ?? summary?.enrolledCourses ?? [];
  const explore = exploreQ.data ?? [];
  const isInitialLoading =
    !summaryQ.data && summaryQ.isLoading && !myCoursesQ.data && myCoursesQ.isLoading;
  const isEmpty = !isInitialLoading && myCourses.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingTop: theme.spacing.three,
        paddingBottom: theme.spacing.eight,
        gap: theme.spacing.five,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.foreground}
        />
      }
    >
      {/* Brand bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Image
          source={theme.mode === 'dark' ? logoDark : logoLight}
          style={{ width: 80, height: 24 }}
          contentFit="contain"
          accessibilityLabel="Aion"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
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
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/profile' as Href)}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Avatar uri={profile?.avatar} name={profile?.fullName} size={36} />
          </Pressable>
        </View>
      </View>

      {/* Greeting */}
      <View style={{ gap: 2 }}>
        <Text variant="display" weight="bold">
          Hi, {firstName} 👋
        </Text>
        <Text variant="body" tone="muted">
          Ready to keep learning?
        </Text>
      </View>

      {isInitialLoading ? (
        <View style={{ gap: theme.spacing.five }}>
          <Card padded>
            <SkeletonGroup count={3} />
          </Card>
          <View style={{ flexDirection: 'row', gap: theme.spacing.three }}>
            <Skeleton height={92} radius={theme.radius.lg} />
            <Skeleton height={92} radius={theme.radius.lg} />
            <Skeleton height={92} radius={theme.radius.lg} />
          </View>
          <Skeleton height={140} radius={theme.radius.lg} />
          <Skeleton height={140} radius={theme.radius.lg} />
        </View>
      ) : isEmpty ? (
        <Card padded>
          <EmptyState
            title="Start your first course"
            description="Browse the catalog and enroll in a course that interests you."
            actionLabel="Explore courses"
            onAction={() => router.push('/(app)/(tabs)/explore' as Href)}
            icon={<Search size={32} color={theme.colors.mutedForeground} accessibilityLabel="" />}
          />
        </Card>
      ) : (
        <>
          {/* Continue learning */}
          {summary?.continueLearning ? (
            <ContinueLearningCard
              summary={summary.continueLearning}
              theme={theme}
              onResume={() => {
                const cl = summary.continueLearning!;
                if (!cl.nextLesson) {
                  router.push(`/(app)/course/${cl.course.id}/curriculum` as Href);
                  return;
                }
                router.push(`/(app)/lesson/${cl.nextLesson.id}?courseId=${cl.course.id}` as Href);
              }}
              onOpenCourse={() =>
                router.push(
                  `/(app)/course/${summary.continueLearning!.course.id}/curriculum` as Href,
                )
              }
            />
          ) : null}

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.three }}>
            <StatCard
              icon={<Layers size={18} color={theme.colors.foreground} />}
              value={summary?.enrollmentsCount ?? 0}
              label="Courses enrolled"
              theme={theme}
            />
            <StatCard
              icon={<BookOpen size={18} color={theme.colors.foreground} />}
              value={summary?.lessonsCompletedCount ?? 0}
              label="Lessons finished"
              theme={theme}
            />
            <StatCard
              icon={<GraduationCap size={18} color={theme.colors.foreground} />}
              value={summary?.coursesCompletedCount ?? 0}
              label="Courses completed"
              theme={theme}
            />
          </View>

          {/* My courses */}
          <Section
            title="My courses"
            onSeeAll={() => router.push('/(app)/(tabs)/learning' as Href)}
            theme={theme}
          >
            {myCoursesQ.isLoading && myCourses.length === 0 ? (
              <Skeleton width={CARD_WIDTH} height={180} radius={theme.radius.lg} />
            ) : (
              <HorizontalCards
                data={myCourses}
                keyExtractor={(item) => item.enrollment.id}
                renderItem={({ item }) => (
                  <CourseCarouselCard
                    course={item.course}
                    theme={theme}
                    progressPercent={item.enrollment.progressPercent}
                    onPress={() =>
                      router.push(`/(app)/course/${item.course.id}/curriculum` as Href)
                    }
                  />
                )}
              />
            )}
          </Section>

          {/* Explore more */}
          <Section
            title="Explore more"
            onSeeAll={() => router.push('/(app)/(tabs)/explore' as Href)}
            theme={theme}
          >
            {exploreQ.isLoading && explore.length === 0 ? (
              <Skeleton width={CARD_WIDTH} height={180} radius={theme.radius.lg} />
            ) : (
              <HorizontalCards
                data={explore}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <CourseCarouselCard
                    course={item}
                    theme={theme}
                    badge={item.level ? capitalize(item.level) : undefined}
                    trailing={
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text variant="caption" tone="muted">
                          Tuition
                        </Text>
                        <Text variant="caption" weight="semibold">
                          {formatPrice(item)}
                        </Text>
                      </View>
                    }
                    onPress={() => router.push(`/(app)/course/${item.id}` as Href)}
                  />
                )}
              />
            )}
          </Section>
        </>
      )}
    </ScrollView>
  );
}
