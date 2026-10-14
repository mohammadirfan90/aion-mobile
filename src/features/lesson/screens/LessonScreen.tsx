/**
 * S12 — Lesson. Matches `docs/design/S12-lesson.png`.
 *
 *   1. Top: the video (video lessons) under a dark bar with Back, or a plain
 *      header with Back for every other type.
 *   2. "CHAPTER n · TITLE" + status pill, the lesson title, the course title.
 *   3. Action row: Notes (S13), Summary (S14), Comments (S18), Ask AI (S17).
 *   4. The type-specific body (`LessonBody`; table in SCREENS.md S12).
 *   5. Bottom bar: Previous · Mark complete / Completed · Next. Previous and
 *      Next cross chapters and skip locked lessons.
 *
 * Mark complete is optimistic and shares its cache with S11, so the
 * curriculum checks update at once. The design's "Resources & Downloads"
 * list isn't built: the backend has no per-lesson attachments (DESIGN.md).
 */
import { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronLeft,
  Lock,
  MessageSquare,
  NotebookPen,
  Sparkles,
} from 'lucide-react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { env } from '@/lib/env';
import { friendlyError } from '@/lib/errors';
import { findLessonPosition, isLessonLocked, lessonView } from '@/lib/lesson';
import { palettes, useTheme, type Theme } from '@/theme';

import { LessonBody } from '../components/LessonBody';
import { LessonVideo } from '../components/LessonVideo';
import {
  useHeartbeat,
  useIsEnrolled,
  useLesson,
  useLessonCurriculum,
  useLessonProgress,
  useMarkComplete,
} from '../hooks';

export function LessonScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; courseId?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : null;

  const lessonQ = useLesson(lessonId);
  const lesson = lessonQ.data ?? null;
  const courseId =
    (typeof params.courseId === 'string' && params.courseId) || lesson?.courseId || null;

  const curriculumQ = useLessonCurriculum(courseId);
  const progressQ = useLessonProgress(courseId);
  const enrolledQ = useIsEnrolled(courseId);
  const markComplete = useMarkComplete(courseId);
  const heartbeat = useHeartbeat(courseId);

  const chapters = useMemo(() => curriculumQ.data?.chapters ?? [], [curriculumQ.data]);
  const position = useMemo(
    () => (lessonId ? findLessonPosition(chapters, lessonId) : null),
    [chapters, lessonId],
  );
  const view = useMemo(() => (lesson ? lessonView(lesson) : null), [lesson]);
  const row = progressQ.data?.find((r) => r.lessonId === lessonId);
  const completed = row?.isCompleted === true;
  const enrolled = enrolledQ.data === true;
  const course = curriculumQ.data?.course ?? null;
  const webUrl = course && env.webUrl ? `${env.webUrl.replace(/\/$/, '')}/courses/${course.slug}` : null;

  const go = useCallback(
    (path: string) => {
      if (!lessonId) return;
      const q = courseId ? `?courseId=${courseId}` : '';
      router.push(`/(app)/lesson/${lessonId}/${path}${q}` as Href);
    },
    [lessonId, courseId],
  );

  const goToLesson = useCallback(
    (id: string) => router.replace(`/(app)/lesson/${id}?courseId=${courseId ?? ''}` as Href),
    [courseId],
  );

  const setCompleted = useCallback(
    (value: boolean) => {
      if (!lessonId || !courseId) return;
      markComplete.mutate(
        { lessonId, completed: value },
        { onError: (e) => showToast(friendlyError((e as { code?: string }).code), 'error') },
      );
    },
    [lessonId, courseId, markComplete],
  );

  const onCorrectAnswer = useCallback(() => {
    if (!completed && enrolled) setCompleted(true);
  }, [completed, enrolled, setCompleted]);

  const onRefresh = useCallback(() => {
    void lessonQ.refetch();
    void progressQ.refetch();
    void curriculumQ.refetch();
  }, [lessonQ, progressQ, curriculumQ]);

  // ── Error states ──
  if (lessonQ.isError && !lesson) {
    const code = (lessonQ.error as { code?: string } | null)?.code;
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <TopBar theme={theme} insetTop={insets.top} />
        {code === 'NOT_ENROLLED' ? (
          <EmptyState
            icon={<Lock size={28} color={theme.colors.mutedForeground} />}
            title="Enroll to open this lesson"
            description="This lesson is part of a course you haven’t joined yet."
            actionLabel={courseId ? 'View course' : undefined}
            onAction={() => courseId && router.replace(`/(app)/course/${courseId}` as Href)}
          />
        ) : (
          <ErrorState
            title={code === 'LESSON_NOT_FOUND' ? 'Lesson not found' : 'Couldn’t load the lesson'}
            description={
              code === 'LESSON_NOT_FOUND'
                ? 'It may have been removed or unpublished.'
                : 'Check your connection and try again.'
            }
            onRetry={code === 'LESSON_NOT_FOUND' ? undefined : onRefresh}
          />
        )}
      </View>
    );
  }

  // Reached by a deep link or a stale screen: locked lessons have no content.
  if (lesson && position && isLessonLocked(position.chapter, position.lesson)) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <TopBar theme={theme} insetTop={insets.top} title={course?.title} />
        <EmptyState
          icon={<Lock size={28} color={theme.colors.mutedForeground} />}
          title="This lesson is locked"
          description="It opens once the earlier chapters are unlocked."
          actionLabel={courseId ? 'Back to the curriculum' : undefined}
          onAction={() => courseId && router.replace(`/(app)/course/${courseId}/curriculum` as Href)}
        />
      </View>
    );
  }

  const isVideo = view?.kind === 'video';
  const resumeAt = row?.lastPositionSeconds || (view?.kind === 'video' ? view.startSeconds : 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {isVideo ? (
        <View style={{ backgroundColor: palettes.dark.background, paddingTop: insets.top }}>
          <View style={{ paddingHorizontal: theme.spacing.two, paddingVertical: theme.spacing.one }}>
            <IconButton
              icon={<ChevronLeft size={24} color={palettes.dark.foreground} />}
              label="Back"
              onPress={() => router.back()}
            />
          </View>
          {view.source && progressQ.isFetched && lessonId ? (
            <LessonVideo
              lessonId={lessonId}
              source={view.source}
              resumeAt={resumeAt}
              posterUrl={view.posterUrl}
              onHeartbeat={(positionSeconds, durationSeconds) => {
                if (enrolled && lessonId) heartbeat.mutate({ lessonId, positionSeconds, durationSeconds });
              }}
              onEnded={() => {
                if (!completed && enrolled) setCompleted(true);
              }}
            />
          ) : (
            <View style={{ width: '100%', aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center' }}>
              {view.source ? null : (
                <Text style={{ color: palettes.dark.mutedForeground }}>This video isn’t available.</Text>
              )}
            </View>
          )}
        </View>
      ) : (
        <TopBar theme={theme} insetTop={insets.top} title={course?.title} />
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: theme.spacing.eight }}
        refreshControl={
          <RefreshControl
            refreshing={lessonQ.isRefetching || progressQ.isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.mutedForeground}
          />
        }
      >
        {!lesson || !view ? (
          <LessonSkeleton theme={theme} />
        ) : (
          <>
            <View
              style={{
                padding: theme.spacing.four,
                gap: theme.spacing.one,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
                <Text variant="label" tone="muted" numberOfLines={1} style={{ flex: 1, letterSpacing: 0.6 }}>
                  {position
                    ? `CHAPTER ${position.chapter.position} · ${position.chapter.title.toUpperCase()}`
                    : ' '}
                </Text>
                {enrolled ? (
                  <Badge label={completed ? 'Completed' : 'In progress'} tone={completed ? 'success' : 'neutral'} />
                ) : lesson.metadata?.isPreview ? (
                  <Badge label="Preview" />
                ) : null}
              </View>
              <Text variant="title">{lesson.title}</Text>
              {course ? (
                <Text tone="muted" numberOfLines={1}>
                  {course.title}
                </Text>
              ) : null}
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: theme.spacing.two,
                padding: theme.spacing.four,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <ActionTile
                label="Notes"
                icon={<NotebookPen size={20} color={theme.colors.foreground} />}
                onPress={() => go('notes')}
                theme={theme}
              />
              <ActionTile
                label="Summary"
                icon={<Sparkles size={20} color={theme.colors.foreground} />}
                onPress={() => go('summary')}
                theme={theme}
              />
              <ActionTile
                label="Comments"
                icon={<MessageSquare size={20} color={theme.colors.foreground} />}
                onPress={() => {
                  if (!lessonId) return;
                  const chapter = position?.chapter.id ? `&chapterId=${position.chapter.id}` : '';
                  router.push(
                    `/(app)/lesson/${lessonId}/comments?courseId=${courseId ?? ''}${chapter}` as Href,
                  );
                }}
                theme={theme}
              />
              <ActionTile
                label="Ask AI"
                icon={<Bot size={20} color={theme.colors.foreground} />}
                onPress={() =>
                  router.push(`/(app)/tutor?courseId=${courseId ?? ''}&lessonId=${lessonId ?? ''}` as Href)
                }
                theme={theme}
              />
            </View>

            <View style={{ padding: theme.spacing.four }}>
              <LessonBody
                lesson={lesson}
                view={view}
                webUrl={webUrl}
                onStartQuiz={() => go('quiz')}
                onOpenAssignment={() => go('assignment')}
                onCorrectAnswer={onCorrectAnswer}
              />
            </View>
          </>
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.two,
          paddingHorizontal: theme.spacing.two,
          paddingTop: theme.spacing.three,
          paddingBottom: Math.max(insets.bottom, theme.spacing.three),
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        <NavButton
          label="Previous"
          direction="prev"
          disabled={!position?.previous}
          onPress={() => position?.previous && goToLesson(position.previous.id)}
          theme={theme}
        />
        <View style={{ flex: 1 }}>
          {!lesson ? (
            <Skeleton height={44} radius={22} />
          ) : !enrolled ? (
            <Button
              label="Enroll to track"
              variant="secondary"
              onPress={() => courseId && router.push(`/(app)/course/${courseId}` as Href)}
            />
          ) : completed ? (
            <Button
              label="Completed"
              variant="secondary"
              iconLeft={<Check size={18} color={theme.colors.success} />}
              accessibilityHint={lesson.type === 'quiz' ? undefined : 'Marks the lesson as not complete'}
              disabled={lesson.type === 'quiz'}
              onPress={() => setCompleted(false)}
            />
          ) : lesson.type === 'quiz' ? (
            <Button label="Start quiz" onPress={() => go('quiz')} />
          ) : (
            <Button
              label="Mark complete"
              iconLeft={<Check size={18} color={theme.colors.primaryForeground} />}
              onPress={() => setCompleted(true)}
            />
          )}
        </View>
        <NavButton
          label="Next"
          direction="next"
          disabled={!position?.next}
          onPress={() => position?.next && goToLesson(position.next.id)}
          theme={theme}
        />
      </View>
    </View>
  );
}

function TopBar({ theme, insetTop, title }: { theme: Theme; insetTop: number; title?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.two,
        paddingTop: insetTop + theme.spacing.two,
        paddingHorizontal: theme.spacing.four,
        paddingBottom: theme.spacing.two,
      }}
    >
      <IconButton
        icon={<ChevronLeft size={22} color={theme.colors.foreground} />}
        label="Back"
        variant="muted"
        onPress={() => router.back()}
      />
      <Text variant="label" tone="muted" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
        {title ?? ''}
      </Text>
      <View style={{ width: 44 }} />
    </View>
  );
}

function ActionTile({
  label,
  icon,
  onPress,
  theme,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: theme.spacing.two,
        paddingVertical: theme.spacing.three,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text variant="label" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function NavButton({
  label,
  direction,
  disabled,
  onPress,
  theme,
}: {
  label: string;
  direction: 'prev' | 'next';
  disabled: boolean;
  onPress: () => void;
  theme: Theme;
}) {
  const color = disabled ? theme.colors.mutedForeground : theme.colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 'prev' ? 'Previous lesson' : 'Next lesson'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.one,
        minHeight: 44,
        paddingHorizontal: theme.spacing.two,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      {direction === 'prev' ? <ArrowLeft size={18} color={color} /> : null}
      <Text variant="label" style={{ color }}>
        {label}
      </Text>
      {direction === 'next' ? <ArrowRight size={18} color={color} /> : null}
    </Pressable>
  );
}

function LessonSkeleton({ theme }: { theme: Theme }) {
  return (
    <View style={{ padding: theme.spacing.four, gap: theme.spacing.three }}>
      <Skeleton width="45%" height={14} />
      <Skeleton width="85%" height={26} />
      <Skeleton width="40%" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.two, marginTop: theme.spacing.three }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1 }}>
            <Skeleton height={76} radius={14} />
          </View>
        ))}
      </View>
      <Skeleton width="100%" height={160} radius={10} />
    </View>
  );
}
