/**
 * The type-specific part of S12, below the title and action row. The video
 * player itself sits at the top of the screen (LessonScreen); this renders
 * its description. See the renderer table in SCREENS.md S12.
 */
import { Linking, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  CalendarClock,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  ListChecks,
  Radio,
} from 'lucide-react-native';

import type { Lesson } from '@/api/types';
import { Markdown } from '@/components/Markdown';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { formatDate, formatDateTime, formatMinutes, formatTime, parseDate } from '@/lib/format';
import { liveStatus, type LessonView } from '@/lib/lesson';
import { useTheme, type Theme } from '@/theme';

import { useAssignmentIntro, useMarkdownUrl, useQuizIntro } from '../hooks';
import { DynamicPage } from './DynamicPage';
import { EmbedFrame } from './EmbedFrame';

export interface LessonBodyProps {
  lesson: Lesson;
  view: LessonView;
  webUrl: string | null;
  onStartQuiz: () => void;
  onOpenAssignment: () => void;
  onCorrectAnswer: () => void;
}

export function LessonBody({
  lesson,
  view,
  webUrl,
  onStartQuiz,
  onOpenAssignment,
  onCorrectAnswer,
}: LessonBodyProps) {
  const theme = useTheme();
  switch (view.kind) {
    case 'video':
      return view.description ? (
        <Section title="About this lesson" meta={formatMinutes(lesson.durationSeconds)} theme={theme}>
          <Card>
            <Markdown value={view.description} />
          </Card>
        </Section>
      ) : null;
    case 'markdown':
      return <MarkdownLesson markdown={view.markdown} url={view.markdownUrl} />;
    case 'dynamic_page':
      if (view.page.kind === 'blocks') {
        return (
          <DynamicPage lessonId={lesson.id} blocks={view.page.blocks} onCorrectAnswer={onCorrectAnswer} />
        );
      }
      if (view.page.kind === 'markdown') return <Markdown value={view.page.markdown} />;
      return <UnsupportedCard webUrl={webUrl} theme={theme} />;
    case 'document':
      return (
        <View style={{ gap: theme.spacing.four }}>
          <FileCard
            icon={<FileText size={22} color={theme.colors.foreground} />}
            title={view.fileName}
            subtitle={`${view.fileType} document`}
            theme={theme}
          >
            <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>
              <Button
                label="Open"
                size="sm"
                fullWidth={false}
                disabled={!view.fileUrl}
                iconRight={<ExternalLink size={14} color={theme.colors.primaryForeground} />}
                onPress={() => view.fileUrl && void WebBrowser.openBrowserAsync(view.fileUrl)}
              />
              {view.allowDownload && view.fileUrl ? (
                <Button
                  label="Download"
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  iconLeft={<Download size={14} color={theme.colors.foreground} />}
                  onPress={() => view.fileUrl && void Linking.openURL(view.fileUrl)}
                />
              ) : null}
            </View>
          </FileCard>
          {view.notes ? <Markdown value={view.notes} /> : null}
        </View>
      );
    case 'embed':
      return (
        <View style={{ gap: theme.spacing.four }}>
          {view.url ? (
            <EmbedFrame
              url={view.url}
              title={lesson.title}
              style={{
                height: Math.min(Math.max(view.height, 240), 640),
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            />
          ) : (
            <UnsupportedCard webUrl={webUrl} theme={theme} />
          )}
          {view.url ? (
            <Button
              label="Open in browser"
              variant="ghost"
              size="sm"
              fullWidth={false}
              style={{ alignSelf: 'flex-start' }}
              iconRight={<ExternalLink size={14} color={theme.colors.foreground} />}
              onPress={() => view.url && void WebBrowser.openBrowserAsync(view.url)}
            />
          ) : null}
          {view.description ? <Markdown value={view.description} /> : null}
        </View>
      );
    case 'resource':
      return (
        <View style={{ gap: theme.spacing.four }}>
          {view.description ? <Markdown value={view.description} /> : null}
          <FileCard
            icon={<Link2 size={22} color={theme.colors.foreground} />}
            title={view.label}
            subtitle={view.url ? hostOf(view.url) : 'No link yet'}
            theme={theme}
          >
            <Button
              label={view.label}
              size="sm"
              fullWidth={false}
              disabled={!view.url}
              iconRight={<ExternalLink size={14} color={theme.colors.primaryForeground} />}
              onPress={() => view.url && void WebBrowser.openBrowserAsync(view.url)}
            />
          </FileCard>
        </View>
      );
    case 'quiz':
      return <QuizIntro lesson={lesson} description={view.description} onStart={onStartQuiz} />;
    case 'assignment':
      return (
        <AssignmentIntro
          lesson={lesson}
          brief={view.brief}
          dueDate={view.settings.dueDate ?? null}
          onOpen={onOpenAssignment}
        />
      );
    case 'live_session':
      return <LiveSession view={view} theme={theme} />;
    case 'unknown':
      return <UnsupportedCard webUrl={webUrl} theme={theme} />;
  }
}

function hostOf(url: string): string {
  const m = url.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1].replace(/^www\./, '') : url;
}

function Section({
  title,
  meta,
  theme,
  children,
}: {
  title: string;
  meta?: string | null;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: theme.spacing.three }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text variant="heading">{title}</Text>
        {meta ? (
          <Text variant="caption" tone="muted">
            {meta}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function FileCard({
  icon,
  title,
  subtitle,
  theme,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <Card style={{ gap: theme.spacing.four }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {title}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      {children}
    </Card>
  );
}

function MarkdownLesson({ markdown, url }: { markdown: string | null; url: string | null }) {
  const theme = useTheme();
  const remote = useMarkdownUrl(url);
  if (markdown) return <Markdown value={markdown} />;
  if (!url) {
    return (
      <Text tone="muted" style={{ paddingVertical: theme.spacing.four }}>
        This reading has no content yet.
      </Text>
    );
  }
  if (remote.isError) {
    return (
      <ErrorState
        title="Couldn’t load this reading"
        description="Check your connection and try again."
        onRetry={() => void remote.refetch()}
      />
    );
  }
  if (!remote.data) {
    return (
      <View style={{ gap: theme.spacing.two }}>
        <Skeleton width="50%" height={22} />
        <Skeleton width="100%" />
        <Skeleton width="92%" />
        <Skeleton width="80%" />
      </View>
    );
  }
  return <Markdown value={remote.data} />;
}

function QuizIntro({
  lesson,
  description,
  onStart,
}: {
  lesson: Lesson;
  description: string | null;
  onStart: () => void;
}) {
  const theme = useTheme();
  const q = useQuizIntro(lesson.id, lesson.courseId, true);
  if (q.isError) {
    return (
      <ErrorState title="Couldn’t load the quiz" description="Try again." onRetry={() => void q.refetch()} />
    );
  }
  if (!q.data) {
    return (
      <Card style={{ gap: theme.spacing.three }}>
        <Skeleton width="40%" />
        <Skeleton width="70%" />
        <Skeleton width="100%" height={44} radius={22} />
      </Card>
    );
  }
  const { quiz, submissions, latestSubmission } = q.data;
  if (!quiz) {
    return <Text tone="muted">This quiz has no questions yet.</Text>;
  }
  const attemptsLeft =
    quiz.maxAttempts === 0 ? Infinity : Math.max(0, quiz.maxAttempts - submissions.length);
  return (
    <Card style={{ gap: theme.spacing.four }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
        <ListChecks size={22} color={theme.colors.foreground} />
        <Text variant="heading" style={{ flex: 1 }}>
          {quiz.title}
        </Text>
      </View>
      {quiz.description || description ? (
        <Text tone="muted">{quiz.description || description}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>
        <Stat label="Questions" value={String(quiz.questions.length)} theme={theme} />
        <Stat label="To pass" value={`${quiz.passingScorePercent}%`} theme={theme} />
        <Stat
          label="Attempts left"
          value={attemptsLeft === Infinity ? '∞' : String(attemptsLeft)}
          theme={theme}
        />
      </View>
      {latestSubmission ? (
        <Text variant="caption" tone="muted">
          Last attempt: {latestSubmission.scorePercent}% ·{' '}
          {latestSubmission.passed ? 'Passed' : 'Not passed'}
        </Text>
      ) : null}
      <Button
        label={attemptsLeft === 0 ? 'Review quiz' : latestSubmission ? 'Retake quiz' : 'Start quiz'}
        onPress={onStart}
      />
    </Card>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View
      style={{
        flex: 1,
        padding: theme.spacing.three,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.muted,
        gap: 2,
      }}
    >
      <Text variant="heading">{value}</Text>
      <Text variant="tiny" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function AssignmentIntro({
  lesson,
  brief,
  dueDate,
  onOpen,
}: {
  lesson: Lesson;
  brief: string | null;
  dueDate: string | null;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const sub = useAssignmentIntro(lesson.id, true);
  const submission = sub.data ?? null;
  const status = !submission
    ? 'Not submitted'
    : submission.status === 'graded'
      ? `Graded: ${submission.scorePercent ?? 0}%`
      : `Submitted on ${formatDate(submission.submittedAt)}`;
  const due = parseDate(dueDate);
  return (
    <Card style={{ gap: theme.spacing.four }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
        <ClipboardList size={22} color={theme.colors.foreground} />
        <Text variant="heading" style={{ flex: 1 }}>
          Assignment
        </Text>
        {sub.isLoading ? <Skeleton width={90} height={20} radius={10} /> : <Badge label={status} />}
      </View>
      {due ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
          <CalendarClock size={16} color={theme.colors.mutedForeground} />
          <Text variant="caption" tone="muted">
            Due {formatDateTime(due)}
          </Text>
        </View>
      ) : null}
      {brief ? <Markdown value={brief} compact /> : null}
      <Button
        label={submission?.status === 'graded' ? 'View feedback' : 'Open assignment'}
        onPress={onOpen}
      />
    </Card>
  );
}

function LiveSession({ view, theme }: { view: Extract<LessonView, { kind: 'live_session' }>; theme: Theme }) {
  const status = liveStatus(view.startsAt, view.settings.durationMinutes);
  const join = view.settings.joinUrl ?? null;
  const recording = view.settings.recordingUrl ?? null;
  const label =
    status === 'live'
      ? 'Live now'
      : status === 'upcoming'
        ? 'Upcoming'
        : status === 'ended'
          ? 'Ended'
          : 'Not scheduled';
  return (
    <View style={{ gap: theme.spacing.four }}>
      <Card style={{ gap: theme.spacing.four }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
          <Radio size={22} color={status === 'live' ? theme.colors.destructive : theme.colors.foreground} />
          <Text variant="heading" style={{ flex: 1 }}>
            Live session
          </Text>
          <Badge label={label} tone={status === 'live' ? 'destructive' : 'neutral'} />
        </View>
        {view.startsAt ? (
          <View style={{ gap: 2 }}>
            <Text variant="bodyStrong">{formatDate(view.startsAt)}</Text>
            <Text tone="muted">
              {formatTime(view.startsAt)}
              {view.settings.durationMinutes ? ` · ${view.settings.durationMinutes} min` : ''}
            </Text>
          </View>
        ) : (
          <Text tone="muted">The time hasn’t been set yet.</Text>
        )}
        {status === 'ended' && recording ? (
          <Button
            label="Watch recording"
            onPress={() => void WebBrowser.openBrowserAsync(recording)}
          />
        ) : (
          <Button
            label="Join"
            disabled={!join || status === 'ended'}
            onPress={() => join && void Linking.openURL(join)}
          />
        )}
      </Card>
      {view.agenda ? <Markdown value={view.agenda} /> : null}
    </View>
  );
}

function UnsupportedCard({ webUrl, theme }: { webUrl: string | null; theme: Theme }) {
  return (
    <Card style={{ gap: theme.spacing.three, alignItems: 'flex-start' }}>
      <Globe size={22} color={theme.colors.foreground} />
      <Text variant="bodyStrong">This lesson opens on the web</Text>
      <Text tone="muted">The app can’t show this type of lesson yet.</Text>
      {webUrl ? (
        <Button
          label="Open on the web"
          fullWidth={false}
          iconRight={<ExternalLink size={14} color={theme.colors.primaryForeground} />}
          onPress={() => void WebBrowser.openBrowserAsync(webUrl)}
        />
      ) : null}
    </Card>
  );
}
