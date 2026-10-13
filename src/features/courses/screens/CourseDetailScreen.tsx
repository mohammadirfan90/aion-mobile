/**
 * S10 — Course detail.
 *
 * Public catalog entry for a single course. Data comes through feature
 * hooks (D-07); no `fetch` in this file. Matches `docs/design/S10-course-detail.png`.
 *
 * Layout:
 *   1. Hero image with overlaid back + share buttons.
 *   2. Level chip, title, stats row (chapters / lessons / duration).
 *   3. Description, then tag chips.
 *   4. "What you'll learn" card with check bullets.
 *   5. "Curriculum" accordion: chapters expanded/collapsed, each lesson row
 *      shows a type icon, title, duration, an optional Preview badge
 *      (`metadata.isPreview`), and a lock when locked.
 *   6. Sticky bottom action bar. The button depends on enrollment + access:
 *      - Enrolled → **Continue** (→ S11).
 *      - `mode: 'closed'` → disabled "Enrollment closed".
 *      - Free → **Enroll for free** (optimistic).
 *      - Invite-only → **Enter invite code** (opens a small dialog).
 *      - Paid → **Get this course on the web** (opens
 *        `EXPO_PUBLIC_WEB_URL/courses/{slug}` in the browser, D-04), with
 *        the hint "Already bought it? Pull to refresh."
 *
 * Tapping a Preview lesson opens S12; tapping a non-preview lesson while
 * not enrolled is a no-op. Tapping a lesson while enrolled → S12.
 *
 * Pull-to-refresh re-runs the curriculum + enrollment queries.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CirclePlay,
  Clock,
  FileText,
  Layers,
  Link2,
  Lock,
  Share2,
  Trophy,
  Users,
  X,
} from 'lucide-react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useTheme, type Theme } from '@/theme';
import { env } from '@/lib/env';
import { formatCoursePrice, isFreeCourse, levelLabel } from '@/lib/course';
import { useCourseCurriculum, useCourseEnrollment, useEnroll } from '@/features/courses/hooks';
import type { Chapter, Course, Lesson, LessonType } from '@/api/types';

function formatTotalDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return '0h';
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem.toString().padStart(2, '0')}m`;
}

function formatDurationLabel(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function lessonTypeIcon(type: LessonType | string, theme: Theme) {
  const color = theme.colors.mutedForeground;
  switch (type) {
    case 'video':
      return <CirclePlay size={20} color={color} />;
    case 'text':
    case 'markdown':
    case 'document':
    case 'resource':
    case 'embed':
      return <FileText size={20} color={color} />;
    case 'quiz':
      return <CircleHelp size={20} color={color} />;
    case 'assignment':
      return <Trophy size={20} color={color} />;
    case 'live':
    case 'live_session':
      return <Users size={20} color={color} />;
    default:
      // Unknown lesson type — render a generic link icon so the row is
      // still tappable (the API says an unknown type must not crash the
      // screen).
      return <Link2 size={20} color={color} />;
  }
}

function Hero({
  course,
  onBack,
  onShare,
  theme,
}: {
  course: Course;
  onBack: () => void;
  onShare: () => void;
  theme: Theme;
}) {
  return (
    <View
      style={{
        height: 220,
        backgroundColor: theme.colors.muted,
        position: 'relative',
      }}
      accessibilityLabel={course.thumbnail ? `${course.title} cover` : undefined}
    >
      {course.thumbnail ? (
        <Image
          source={{ uri: course.thumbnail }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      ) : null}
      <View
        style={{
          position: 'absolute',
          top: theme.spacing.twelve,
          left: theme.spacing.four,
          right: theme.spacing.four,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <IconButton
          icon={<ChevronLeft size={22} color={theme.colors.foreground} />}
          label="Back"
          variant="muted"
          onPress={onBack}
        />
        <IconButton
          icon={<Share2 size={20} color={theme.colors.foreground} />}
          label="Share"
          variant="muted"
          onPress={onShare}
        />
      </View>
    </View>
  );
}

function Stat({ icon, label, theme }: { icon: React.ReactNode; label: string; theme: Theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function CurriculumChapter({
  chapter,
  isOpen,
  onToggle,
  onLessonPress,
  isEnrolled,
  theme,
}: {
  chapter: Chapter;
  isOpen: boolean;
  onToggle: () => void;
  onLessonPress: (lesson: Lesson) => void;
  isEnrolled: boolean;
  theme: Theme;
}) {
  const locked = chapter.locked;
  const chapterDuration = chapter.lessons.reduce((sum, l) => sum + (l.durationSeconds ?? 0), 0);
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <Pressable
        onPress={onToggle}
        disabled={locked}
        accessibilityRole="button"
        accessibilityLabel={`${chapter.title}, ${chapter.lessons.length} lessons${
          locked ? ', locked' : isOpen ? ', expanded' : ', collapsed'
        }`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          padding: theme.spacing.four,
          gap: theme.spacing.three,
          opacity: pressed && !locked ? 0.85 : 1,
        })}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: theme.radius.full,
            backgroundColor: theme.colors.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {locked ? (
            <Lock size={16} color={theme.colors.mutedForeground} />
          ) : (
            <Text variant="label" weight="semibold">
              {chapter.position}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {chapter.title}
          </Text>
          <Text variant="caption" tone="muted">
            {chapter.lessons.length} lesson{chapter.lessons.length === 1 ? '' : 's'} ·{' '}
            {formatTotalDuration(chapterDuration)}
          </Text>
        </View>
        {!locked ? (
          <ChevronDown
            size={20}
            color={theme.colors.mutedForeground}
            style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
          />
        ) : null}
      </Pressable>

      {isOpen && !locked
        ? chapter.lessons.map((lesson) => {
            const lessonLocked = lesson.metadata?.isLocked === true;
            const isPreview = lesson.metadata?.isPreview === true;
            const tappable = isEnrolled || isPreview;
            return (
              <Pressable
                key={lesson.id}
                disabled={!tappable}
                onPress={() => tappable && onLessonPress(lesson)}
                accessibilityRole="button"
                accessibilityLabel={`${lesson.title}, ${lesson.type}${
                  isPreview ? ', preview' : lessonLocked ? ', locked' : ''
                }`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.three,
                  paddingHorizontal: theme.spacing.four,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                  gap: theme.spacing.three,
                  opacity: pressed && tappable ? 0.7 : lessonLocked ? 0.5 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.muted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {lessonLocked ? (
                    <Lock size={16} color={theme.colors.mutedForeground} />
                  ) : (
                    lessonTypeIcon(lesson.type, theme)
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {lesson.title}
                  </Text>
                  <Text variant="tiny" tone="muted">
                    {formatDurationLabel(lesson.durationSeconds)}
                  </Text>
                </View>
                {isPreview ? <Badge label="Preview" tone="primary" /> : null}
              </Pressable>
            );
          })
        : null}
    </Card>
  );
}

function CurriculumSkeleton({ theme }: { theme: Theme }) {
  return (
    <View style={{ gap: theme.spacing.three }}>
      {[0, 1, 2].map((i) => (
        <Card key={i} padded={false}>
          <View style={{ padding: theme.spacing.four, gap: theme.spacing.two }}>
            <Skeleton width="60%" />
            <Skeleton width="40%" />
          </View>
        </Card>
      ))}
    </View>
  );
}

function ActionBar({
  course,
  isEnrolled,
  onEnrollFree,
  onOpenInvite,
  onGetOnWeb,
  enrolling,
  enrollError,
  theme,
}: {
  course: Course;
  isEnrolled: boolean;
  onEnrollFree: () => void;
  onOpenInvite: () => void;
  onGetOnWeb: () => void;
  enrolling: boolean;
  enrollError: string | null;
  theme: Theme;
}) {
  const access = course.accessConfig;
  const mode = access?.mode ?? 'free';
  const isClosed = mode === 'closed';
  const free = isFreeCourse(course);

  let body: React.ReactNode;
  if (isEnrolled) {
    body = (
      <Button
        label="Continue"
        iconRight={<ChevronRight size={18} color={theme.colors.primaryForeground} />}
        onPress={() => router.push(`/(app)/course/${course.id}/curriculum` as Href)}
      />
    );
  } else if (isClosed) {
    body = <Button label="Enrollment closed" disabled fullWidth />;
  } else if (free) {
    body = <Button label="Enroll for free" loading={enrolling} onPress={onEnrollFree} />;
  } else if (mode === 'invite_only') {
    body = <Button label="Enter invite code" onPress={onOpenInvite} />;
  } else {
    // Paid (one_time / subscription). D-04: payments are web-only.
    body = (
      <View style={{ gap: theme.spacing.two }}>
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          Already bought it? Pull to refresh.
        </Text>
        <Button
          label="Get this course on the web"
          iconRight={<ChevronRight size={18} color={theme.colors.primaryForeground} />}
          onPress={onGetOnWeb}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.four,
        paddingTop: theme.spacing.three,
        paddingBottom: theme.spacing.four,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        gap: theme.spacing.two,
      }}
    >
      {!isEnrolled && !isClosed ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text variant="caption" tone="muted">
            {free ? 'Free' : mode === 'invite_only' ? 'Invite only' : 'One-time access'}
          </Text>
          <Text variant="heading" weight="bold">
            {formatCoursePrice(course)}
          </Text>
        </View>
      ) : null}
      {body}
      {enrollError ? (
        <Text variant="caption" tone="destructive" style={{ textAlign: 'center' }}>
          {enrollError}
        </Text>
      ) : null}
    </View>
  );
}

function InviteDialog({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
  submitting: boolean;
  error: string | null;
  theme: Theme;
}) {
  const [code, setCode] = useState('');

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setCode('');
        onClose();
      }}
    >
      <Pressable
        onPress={() => {
          setCode('');
          onClose();
        }}
        style={{
          flex: 1,
          backgroundColor: theme.colors.scrim,
          justifyContent: 'center',
          padding: theme.spacing.four,
        }}
      >
        <Pressable
          onPress={() => {
            /* swallow — keep the dialog open when tapping inside */
          }}
          accessibilityViewIsModal
          style={{
            backgroundColor: theme.colors.background,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.four,
            gap: theme.spacing.three,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="heading" weight="bold">
              Enter invite code
            </Text>
            <IconButton
              icon={<X size={20} color={theme.colors.foreground} />}
              label="Close"
              onPress={() => {
                setCode('');
                onClose();
              }}
            />
          </View>
          <Text variant="caption" tone="muted">
            This course is invite-only. Enter the code you were given to enroll.
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="e.g. TEAM-2026"
            placeholderTextColor={theme.colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Invite code"
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.three,
              paddingVertical: theme.spacing.three,
              color: theme.colors.foreground,
              fontSize: 16,
            }}
          />
          {error ? (
            <Text variant="caption" tone="destructive">
              {error}
            </Text>
          ) : null}
          <View
            style={{ flexDirection: 'row', gap: theme.spacing.two, justifyContent: 'flex-end' }}
          >
            <Button
              label="Cancel"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => {
                setCode('');
                onClose();
              }}
            />
            <Button
              label="Enroll"
              size="sm"
              fullWidth={false}
              loading={submitting}
              disabled={!code.trim()}
              onPress={() => onSubmit(code.trim())}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function CourseDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = typeof id === 'string' ? id : null;

  const curriculumQ = useCourseCurriculum(courseId);
  const enrollmentQ = useCourseEnrollment(courseId);
  const enrollM = useEnroll();

  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [inviteOpen, setInviteOpen] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const course = curriculumQ.data?.course ?? null;
  const chapters = useMemo(() => curriculumQ.data?.chapters ?? [], [curriculumQ.data]);
  const stats = useMemo(() => {
    const lessons = chapters.flatMap((c) => c.lessons);
    const totalSeconds = lessons.reduce((s, l) => s + (l.durationSeconds ?? 0), 0);
    return {
      lessons,
      totalSeconds,
      chapterCount: chapters.length,
      lessonCount: lessons.length,
    };
  }, [chapters]);

  const isEnrolled = !!enrollmentQ.data;

  const toggleChapter = useCallback((chapterId: string) => {
    setOpenChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
  }, []);

  const onLessonPress = useCallback(
    (lesson: Lesson) => {
      router.push(`/(app)/lesson/${lesson.id}?courseId=${courseId ?? ''}` as Href);
    },
    [courseId],
  );

  const onEnrollFree = useCallback(async () => {
    if (!courseId) return;
    setEnrollError(null);
    try {
      await enrollM.mutateAsync({ courseId });
    } catch (e) {
      setEnrollError(e instanceof Error ? e.message : 'Could not enroll. Please try again.');
    }
  }, [courseId, enrollM]);

  const onInviteSubmit = useCallback(
    async (code: string) => {
      if (!courseId) return;
      setEnrollError(null);
      try {
        await enrollM.mutateAsync({ courseId, inviteCode: code });
        setInviteOpen(false);
      } catch (e) {
        setEnrollError(e instanceof Error ? e.message : 'Invalid invite code.');
      }
    },
    [courseId, enrollM],
  );

  const onGetOnWeb = useCallback(() => {
    if (!course) return;
    const slug = course.slug;
    const url = `${env.webUrl.replace(/\/$/, '')}/courses/${slug}`;
    void Linking.openURL(url);
  }, [course]);

  const onRefresh = useCallback(() => {
    void curriculumQ.refetch();
    void enrollmentQ.refetch();
  }, [curriculumQ, enrollmentQ]);

  if (curriculumQ.isError && !curriculumQ.data) {
    const code = (curriculumQ.error as { code?: string } | null)?.code;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: theme.spacing.twelve,
        }}
      >
        <ErrorState
          title={code === 'COURSE_NOT_FOUND' ? 'Course not found' : 'Couldn’t load this course'}
          description="Check your connection and try again."
          onRetry={onRefresh}
        />
      </View>
    );
  }

  const isLoading = curriculumQ.isLoading && !curriculumQ.data;
  const isEmpty = !isLoading && !!curriculumQ.data && chapters.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: theme.spacing.eight }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={curriculumQ.isFetching || enrollmentQ.isFetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.mutedForeground}
          />
        }
      >
        {isLoading || !course ? (
          <View style={{ height: 220, backgroundColor: theme.colors.muted }} />
        ) : (
          <Hero
            course={course}
            onBack={() => router.back()}
            onShare={() => {
              /* Share is wired up in P3-05. */
            }}
            theme={theme}
          />
        )}

        <View style={{ padding: theme.spacing.four, gap: theme.spacing.four }}>
          {isLoading || !course ? (
            <View style={{ gap: theme.spacing.two }}>
              <Skeleton width={120} height={22} />
              <Skeleton width="85%" height={28} />
              <Skeleton width="50%" height={18} />
            </View>
          ) : (
            <>
              {course.level ? (
                <View style={{ alignSelf: 'flex-start' }}>
                  <Chip label={levelLabel(course.level).toUpperCase()} />
                </View>
              ) : null}
              <Text variant="display" weight="bold">
                {course.title}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.four,
                  flexWrap: 'wrap',
                }}
              >
                <Stat
                  icon={<Layers size={16} color={theme.colors.mutedForeground} />}
                  label={`${stats.chapterCount} chapters`}
                  theme={theme}
                />
                <Stat
                  icon={<Bookmark size={16} color={theme.colors.mutedForeground} />}
                  label={`${stats.lessonCount} lessons`}
                  theme={theme}
                />
                <Stat
                  icon={<Clock size={16} color={theme.colors.mutedForeground} />}
                  label={formatTotalDuration(stats.totalSeconds)}
                  theme={theme}
                />
              </View>

              {course.description ? (
                <Text variant="body" tone="muted">
                  {course.description}
                </Text>
              ) : null}

              {course.tags && course.tags.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.two }}>
                  {course.tags.map((tag) => (
                    <Chip key={tag} label={tag} />
                  ))}
                </View>
              ) : null}
            </>
          )}

          {/* What you'll learn */}
          {isLoading || !course ? (
            <Card>
              <SkeletonGroup count={4} />
            </Card>
          ) : course.learnings && course.learnings.length > 0 ? (
            <View style={{ gap: theme.spacing.three }}>
              <Text variant="heading" weight="bold">
                What you’ll learn
              </Text>
              <Card>
                <View style={{ gap: theme.spacing.three }}>
                  {course.learnings.map((line, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: 'row',
                        gap: theme.spacing.three,
                        alignItems: 'flex-start',
                      }}
                    >
                      <Check size={18} color={theme.colors.success} style={{ marginTop: 2 }} />
                      <Text variant="body" style={{ flex: 1 }}>
                        {line}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            </View>
          ) : null}

          {/* Curriculum */}
          <View style={{ gap: theme.spacing.three }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <Text variant="heading" weight="bold">
                Curriculum
              </Text>
              {!isLoading && course ? (
                <Text variant="caption" tone="muted">
                  {stats.chapterCount} chapters · {stats.lessonCount} lessons
                </Text>
              ) : null}
            </View>

            {isLoading ? (
              <CurriculumSkeleton theme={theme} />
            ) : isEmpty ? (
              <EmptyState
                title="Curriculum coming soon"
                description="This course doesn't have lessons yet."
              />
            ) : (
              <View style={{ gap: theme.spacing.three }}>
                {chapters.map((chapter) => (
                  <CurriculumChapter
                    key={chapter.id}
                    chapter={chapter}
                    isOpen={!!openChapters[chapter.id] || chapter.position === 1}
                    onToggle={() => toggleChapter(chapter.id)}
                    onLessonPress={onLessonPress}
                    isEnrolled={isEnrolled}
                    theme={theme}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {course ? (
        <ActionBar
          course={course}
          isEnrolled={isEnrolled}
          onEnrollFree={onEnrollFree}
          onOpenInvite={() => {
            setEnrollError(null);
            setInviteOpen(true);
          }}
          onGetOnWeb={onGetOnWeb}
          enrolling={enrollM.isPending}
          enrollError={enrollError}
          theme={theme}
        />
      ) : null}

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={onInviteSubmit}
        submitting={enrollM.isPending}
        error={enrollError}
        theme={theme}
      />
    </View>
  );
}
