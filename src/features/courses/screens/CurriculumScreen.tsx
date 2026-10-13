/**
 * S11 — Curriculum.
 *
 * The "inside the course" hub for an enrolled student. Data comes through
 * feature hooks (D-07); no `fetch` in this file. Matches
 * `docs/design/S11-curriculum.png`.
 *
 * Layout:
 *   1. Top bar: back button (circular muted pill) + centered course title +
 *      a `...` overflow menu (Notes, Certificate when eligible, Get help).
 *   2. Progress card: progress ring with %, "X of Y lessons complete", the
 *      next lesson's chapter + title, and a **Resume** button that opens
 *      S12 for the first uncompleted, non-locked lesson (or S12 for the
 *      first lesson if everything is done — S11 doesn't make sense past
 *      100%, but the resume target is still tappable).
 *   3. Chapter list. Each chapter header shows its position, title, and
 *      (done / total) count on the left, and a status pill on the right:
 *      **Completed** (all done), **In progress** (partial), or **Locked**
 *      (chapter is locked). Locked chapters are dim and their lessons
 *      can't be tapped.
 *   4. Lesson rows: type icon, title, "duration · type label", and a
 *      completion check on the right. The **Up Next** lesson (the resume
 *      target) gets a bigger filled icon and an "UP NEXT" badge.
 *
 * Tapping any non-locked, non-preview-blocked lesson → S12 with
 * `courseId` in the query. The overflow menu opens S13 / S28 / S24
 * depending on which item the user picks.
 */
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  CircleHelp,
  CirclePlay,
  Clock,
  FileText,
  GraduationCap,
  Link2,
  Lock,
  MoreVertical,
  StickyNote,
  Trophy,
  Users,
} from 'lucide-react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useTheme, type Theme } from '@/theme';
import {
  useCourseCurriculum,
  useCourseLessonProgress,
  useCourseProgress,
} from '@/features/courses/hooks';
import type { Chapter, Course, Lesson, LessonType } from '@/api/types';

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function lessonTypeLabel(type: LessonType | string): string {
  switch (type) {
    case 'video':
      return 'Video';
    case 'markdown':
      return 'Reading';
    case 'dynamic_page':
      return 'Interactive';
    case 'document':
      return 'Document';
    case 'embed':
      return 'Embed';
    case 'resource':
      return 'Resource';
    case 'quiz':
      return 'Quiz';
    case 'assignment':
      return 'Assignment';
    case 'live_session':
      return 'Live session';
    default:
      return 'Lesson';
  }
}

function LessonTypeIcon({ type, theme }: { type: LessonType | string; theme: Theme }) {
  const color = theme.colors.mutedForeground;
  switch (type) {
    case 'video':
      return <CirclePlay size={20} color={color} />;
    case 'markdown':
    case 'dynamic_page':
    case 'document':
    case 'resource':
    case 'embed':
      return <FileText size={20} color={color} />;
    case 'quiz':
      return <CircleHelp size={20} color={color} />;
    case 'assignment':
      return <Trophy size={20} color={color} />;
    case 'live_session':
      return <Users size={20} color={color} />;
    default:
      return <Link2 size={20} color={color} />;
  }
}

function findResumeLesson(
  chapters: Chapter[],
  completedSet: Set<string>,
): { lesson: Lesson; chapter: Chapter } | null {
  for (const chapter of chapters) {
    if (chapter.locked) continue;
    for (const lesson of chapter.lessons) {
      if (lesson.metadata?.isLocked === true) continue;
      if (completedSet.has(lesson.id)) continue;
      return { lesson, chapter };
    }
  }
  // Everything completed: fall back to the first lesson of the first
  // un-locked chapter so the Resume button still has a target.
  for (const chapter of chapters) {
    if (chapter.locked) continue;
    const first = chapter.lessons[0];
    if (first) return { lesson: first, chapter };
  }
  return null;
}

function findNextLessonTitle(
  chapters: Chapter[],
): { chapterTitle: string; lessonTitle: string } | null {
  for (const chapter of chapters) {
    if (chapter.locked) continue;
    for (const lesson of chapter.lessons) {
      if (lesson.metadata?.isLocked === true) continue;
      return { chapterTitle: chapter.title, lessonTitle: lesson.title };
    }
  }
  return null;
}

function HeaderBar({
  title,
  onBack,
  onMenu,
  theme,
}: {
  title: string;
  onBack: () => void;
  onMenu: () => void;
  theme: Theme;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.four,
        paddingTop: theme.spacing.twelve,
        paddingBottom: theme.spacing.three,
        gap: theme.spacing.two,
      }}
    >
      <IconButton
        icon={<ChevronLeft size={22} color={theme.colors.foreground} />}
        label="Back"
        variant="muted"
        onPress={onBack}
      />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <IconButton
        icon={<MoreVertical size={20} color={theme.colors.foreground} />}
        label="Course menu"
        variant="muted"
        onPress={onMenu}
      />
    </View>
  );
}

function ProgressCard({
  course,
  chapters,
  progress,
  onResume,
  theme,
}: {
  course: Course;
  chapters: Chapter[];
  progress: { completed: number; total: number; percent: number };
  onResume: () => void;
  theme: Theme;
}) {
  const next = findNextLessonTitle(chapters);

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: theme.spacing.four, alignItems: 'center' }}>
        <ProgressRing
          value={progress.percent / 100}
          size={88}
          stroke={8}
          label={`${progress.percent}%`}
        />
        <View style={{ flex: 1, gap: theme.spacing.two }}>
          <Text variant="bodyStrong">
            {progress.completed} of {progress.total} lessons complete
          </Text>
          {next ? (
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {course.tags?.[0] ?? course.level ?? 'Course'} · Next: {next.chapterTitle}:{' '}
              {next.lessonTitle}
            </Text>
          ) : null}
          <View style={{ marginTop: theme.spacing.two }}>
            <Button
              label="Resume"
              size="sm"
              fullWidth={false}
              iconLeft={<CirclePlay size={16} color={theme.colors.primaryForeground} />}
              onPress={onResume}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

function ChapterStatusPill({
  completed,
  total,
  locked,
  theme,
}: {
  completed: number;
  total: number;
  locked: boolean;
  theme: Theme;
}) {
  if (locked) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Lock size={14} color={theme.colors.mutedForeground} />
        <Text variant="caption" tone="muted">
          Locked
        </Text>
      </View>
    );
  }
  if (total === 0) {
    return <Badge label="—" tone="neutral" />;
  }
  if (completed === total) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Check size={14} color={theme.colors.success} />
        <Text variant="caption" tone="success">
          Completed
        </Text>
      </View>
    );
  }
  if (completed === 0) {
    return (
      <Text variant="caption" tone="muted">
        In progress
      </Text>
    );
  }
  return (
    <Text variant="caption" tone="muted">
      In progress
    </Text>
  );
}

function LessonRow({
  lesson,
  isCompleted,
  isResumeTarget,
  isLocked,
  onPress,
  theme,
}: {
  lesson: Lesson;
  isCompleted: boolean;
  isResumeTarget: boolean;
  isLocked: boolean;
  onPress: () => void;
  theme: Theme;
}) {
  const tappable = !isLocked;
  return (
    <Pressable
      onPress={onPress}
      disabled={!tappable}
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}, ${lessonTypeLabel(lesson.type)}${
        isCompleted ? ', completed' : isResumeTarget ? ', up next' : isLocked ? ', locked' : ''
      }`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.three,
        paddingVertical: theme.spacing.three,
        paddingHorizontal: theme.spacing.four,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        opacity: pressed && tappable ? 0.7 : isLocked ? 0.5 : 1,
      })}
    >
      <View
        style={{
          width: isResumeTarget ? 44 : 36,
          height: isResumeTarget ? 44 : 36,
          borderRadius: theme.radius.md,
          backgroundColor: isResumeTarget ? theme.colors.primary : theme.colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isLocked ? (
          <Lock size={isResumeTarget ? 20 : 16} color={theme.colors.mutedForeground} />
        ) : isResumeTarget ? (
          <CirclePlay size={22} color={theme.colors.primaryForeground} />
        ) : (
          <LessonTypeIcon type={lesson.type} theme={theme} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {lesson.title}
          </Text>
          {isResumeTarget ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: theme.radius.sm,
                backgroundColor: theme.colors.primary,
              }}
            >
              <Text variant="tiny" style={{ color: theme.colors.primaryForeground }}>
                UP NEXT
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock size={12} color={theme.colors.mutedForeground} />
          <Text variant="tiny" tone="muted">
            {formatDuration(lesson.durationSeconds)} · {lessonTypeLabel(lesson.type)}
          </Text>
        </View>
      </View>
      {isCompleted ? (
        <CheckCircle2 size={20} color={theme.colors.success} />
      ) : isResumeTarget ? null : (
        <Circle size={20} color={theme.colors.mutedForeground} />
      )}
    </Pressable>
  );
}

function ChapterBlock({
  chapter,
  completedSet,
  resumeLessonId,
  onLessonPress,
  theme,
}: {
  chapter: Chapter;
  completedSet: Set<string>;
  resumeLessonId: string | null;
  onLessonPress: (lesson: Lesson) => void;
  theme: Theme;
}) {
  const completed = chapter.lessons.filter((l) => completedSet.has(l.id)).length;
  const locked = chapter.locked;
  return (
    <View style={{ gap: theme.spacing.two }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.four,
          paddingTop: theme.spacing.four,
          opacity: locked ? 0.6 : 1,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <Text variant="title" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {chapter.position}. {chapter.title}
          </Text>
          <Text variant="caption" tone="muted">
            {completed}/{chapter.lessons.length}
          </Text>
        </View>
        <ChapterStatusPill
          completed={completed}
          total={chapter.lessons.length}
          locked={locked}
          theme={theme}
        />
      </View>

      {!locked ? (
        <Card padded={false}>
          {chapter.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              isCompleted={completedSet.has(lesson.id)}
              isResumeTarget={lesson.id === resumeLessonId}
              isLocked={lesson.metadata?.isLocked === true}
              onPress={() => onLessonPress(lesson)}
              theme={theme}
            />
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function CourseMenuSheet({
  open,
  onClose,
  onNotes,
  onCertificate,
  onGetHelp,
  showCertificate,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  onNotes: () => void;
  onCertificate: () => void;
  onGetHelp: () => void;
  showCertificate: boolean;
  theme: Theme;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: theme.colors.scrim,
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={() => {
            /* swallow — keep the sheet open when tapping inside */
          }}
          style={{
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingHorizontal: theme.spacing.four,
            paddingTop: theme.spacing.four,
            paddingBottom: theme.spacing.eight,
            gap: theme.spacing.two,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.colors.border,
              marginBottom: theme.spacing.two,
            }}
          />
          <MenuItem
            icon={<StickyNote size={20} color={theme.colors.foreground} />}
            label="Notes"
            description="All your notes for this course"
            onPress={onNotes}
            theme={theme}
          />
          {showCertificate ? (
            <MenuItem
              icon={<GraduationCap size={20} color={theme.colors.foreground} />}
              label="Certificate"
              description="View or share your certificate"
              onPress={onCertificate}
              theme={theme}
            />
          ) : null}
          <MenuItem
            icon={<CircleHelp size={20} color={theme.colors.foreground} />}
            label="Get help"
            description="Open a new support ticket"
            onPress={onGetHelp}
            theme={theme}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuItem({
  icon,
  label,
  description,
  onPress,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.three,
        paddingVertical: theme.spacing.three,
        paddingHorizontal: theme.spacing.two,
        borderRadius: theme.radius.md,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function CurriculumScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = typeof id === 'string' ? id : null;

  const curriculumQ = useCourseCurriculum(courseId);
  const progressQ = useCourseProgress(courseId);
  const lessonProgressQ = useCourseLessonProgress(courseId);

  const [menuOpen, setMenuOpen] = useState(false);

  const course = curriculumQ.data?.course ?? null;
  const chapters = useMemo(() => curriculumQ.data?.chapters ?? [], [curriculumQ.data]);

  const completedSet = useMemo(() => {
    const set = new Set<string>();
    (lessonProgressQ.data ?? []).forEach((p) => {
      if (p.isCompleted) set.add(p.lessonId);
    });
    return set;
  }, [lessonProgressQ.data]);

  const resume = useMemo(() => findResumeLesson(chapters, completedSet), [chapters, completedSet]);

  const onResume = useCallback(() => {
    if (!resume || !courseId) return;
    router.push(`/(app)/lesson/${resume.lesson.id}?courseId=${courseId}` as Href);
  }, [resume, courseId]);

  const onLessonPress = useCallback(
    (lesson: Lesson) => {
      if (!courseId) return;
      router.push(`/(app)/lesson/${lesson.id}?courseId=${courseId}` as Href);
    },
    [courseId],
  );

  const onRefresh = useCallback(() => {
    void curriculumQ.refetch();
    void progressQ.refetch();
    void lessonProgressQ.refetch();
  }, [curriculumQ, progressQ, lessonProgressQ]);

  const totalLessons = chapters.reduce((s, c) => s + c.lessons.length, 0);
  const completedCount = progressQ.data?.completed ?? 0;
  const percent = progressQ.data?.percent ?? 0;
  const showCertificate = progressQ.data?.isCompleted === true;

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
          title={code === 'COURSE_NOT_FOUND' ? 'Course not found' : 'Couldn’t load the curriculum'}
          description="Check your connection and try again."
          onRetry={onRefresh}
        />
      </View>
    );
  }

  const isLoading = curriculumQ.isLoading && !curriculumQ.data;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <HeaderBar
        title={course?.title ?? ''}
        onBack={() => router.back()}
        onMenu={() => setMenuOpen(true)}
        theme={theme}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.four,
          paddingBottom: theme.spacing.eight,
          gap: theme.spacing.four,
        }}
        refreshControl={
          <RefreshControl
            refreshing={
              curriculumQ.isFetching || progressQ.isFetching || lessonProgressQ.isFetching
            }
            onRefresh={onRefresh}
            tintColor={theme.colors.mutedForeground}
          />
        }
      >
        {isLoading || !course ? (
          <Card>
            <View style={{ flexDirection: 'row', gap: theme.spacing.four, alignItems: 'center' }}>
              <Skeleton width={88} height={88} radius={44} />
              <View style={{ flex: 1, gap: theme.spacing.two }}>
                <Skeleton width="60%" />
                <Skeleton width="80%" />
                <Skeleton width={100} height={36} radius={18} />
              </View>
            </View>
          </Card>
        ) : (
          <ProgressCard
            course={course}
            chapters={chapters}
            progress={{ completed: completedCount, total: totalLessons, percent }}
            onResume={onResume}
            theme={theme}
          />
        )}

        {isLoading
          ? [0, 1, 2].map((i) => (
              <View key={i} style={{ gap: theme.spacing.two }}>
                <Skeleton width="50%" height={20} />
                <Card padded={false}>
                  {[0, 1].map((j) => (
                    <View
                      key={j}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing.three,
                        padding: theme.spacing.four,
                      }}
                    >
                      <Skeleton width={36} height={36} radius={8} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Skeleton width="70%" />
                        <Skeleton width="40%" />
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            ))
          : chapters.map((chapter) => (
              <ChapterBlock
                key={chapter.id}
                chapter={chapter}
                completedSet={completedSet}
                resumeLessonId={resume?.lesson.id ?? null}
                onLessonPress={onLessonPress}
                theme={theme}
              />
            ))}
      </ScrollView>

      <CourseMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNotes={() => {
          setMenuOpen(false);
          if (courseId) {
            // S13 is keyed by lessonId; the spec says "all notes for the
            // course" — the placeholder screen will need a courseId route
            // variant later. For v1 we navigate to a no-op.
            router.push(`/(app)/(tabs)/profile` as Href);
          }
        }}
        onCertificate={() => {
          setMenuOpen(false);
          if (courseId) router.push(`/(app)/course/${courseId}/certificate` as Href);
        }}
        onGetHelp={() => {
          setMenuOpen(false);
          if (courseId) router.push(`/(app)/support/new?courseId=${courseId}` as Href);
        }}
        showCertificate={showCertificate}
        theme={theme}
      />
    </View>
  );
}
