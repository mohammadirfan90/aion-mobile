/**
 * S15 — Quiz. Intro → Questions → Result. Matches
 * `docs/design/S15-quiz-question.png` and `docs/design/S15b-quiz-result.png`
 * (the design's share button isn't built: there's nothing to share yet).
 *
 * - Intro: title, description, question count, passing %, attempts used /
 *   max, and the last attempt's score.
 * - Questions: one per page with "3 / 10" and a progress bar. `single` and
 *   `boolean` are radio cards; `multiple` are checkbox cards ("Select all
 *   that apply"). Shuffled once per attempt when `shuffleQuestions`. Answers
 *   live in one map, so they survive moving back and forth. Submitting with
 *   unanswered questions asks first; leaving mid-quiz asks "Discard answers?".
 * - Result: score ring, passed / failed, "x of y correct", and a review of
 *   every question from `feedback`. Retry only while attempts remain.
 */
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  Info,
  ListChecks,
  RotateCcw,
  X,
} from 'lucide-react-native';

import type { QuizInfo, QuizQuestionItem, QuizSubmitResult } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { useTheme, type Theme } from '@/theme';

import { useLessonQuiz, useSubmitQuiz } from '../hooks';

type Phase = 'intro' | 'questions' | 'result';
type Answers = Record<string, string[]>;

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function typeHint(type: QuizQuestionItem['type']): string {
  if (type === 'multiple') return 'SELECT ALL THAT APPLY';
  if (type === 'boolean') return 'TRUE OR FALSE';
  return 'CHOOSE ONE';
}

function typeLabel(type: QuizQuestionItem['type']): string {
  if (type === 'multiple') return 'Multi-select';
  if (type === 'boolean') return 'True/False';
  return 'Single choice';
}

export function QuizScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string; courseId?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : null;
  const courseId = typeof params.courseId === 'string' && params.courseId ? params.courseId : null;

  const quizQ = useLessonQuiz(lessonId, courseId);
  const submit = useSubmitQuiz(lessonId, courseId);

  const [phase, setPhase] = useState<Phase>('intro');
  const [order, setOrder] = useState<QuizQuestionItem[]>([]);
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  const quiz = quizQ.data?.quiz ?? null;
  const submissions = quizQ.data?.submissions ?? [];
  const attemptsUsed = submissions.length;
  const attemptsLeft = !quiz
    ? 0
    : quiz.maxAttempts === 0
      ? Infinity
      : Math.max(0, quiz.maxAttempts - attemptsUsed);

  const answeredCount = order.filter((q) => (answers[q.id] ?? []).length > 0).length;
  const inProgress = phase === 'questions' && answeredCount > 0 && !submit.isPending;

  usePreventRemove(inProgress, ({ data }) => {
    Alert.alert('Discard answers?', 'Your answers for this attempt will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const start = useCallback(() => {
    if (!quiz) return;
    setOrder(quiz.shuffleQuestions ? shuffled(quiz.questions) : quiz.questions);
    setAnswers({});
    setPage(0);
    setResult(null);
    setPhase('questions');
  }, [quiz]);

  const toggle = (q: QuizQuestionItem, optionId: string) => {
    setAnswers((prev) => {
      const current = prev[q.id] ?? [];
      if (q.type === 'multiple') {
        const next = current.includes(optionId)
          ? current.filter((x) => x !== optionId)
          : [...current, optionId];
        return { ...prev, [q.id]: next };
      }
      return { ...prev, [q.id]: [optionId] };
    });
  };

  const doSubmit = () => {
    submit.mutate(answers, {
      onSuccess: (res) => {
        setResult(res);
        setPhase('result');
      },
      onError: (e) => {
        const code = (e as { code?: string }).code;
        showToast(
          code === 'MAX_ATTEMPTS_EXCEEDED' ? 'No attempts left for this quiz.' : friendlyError(code),
          'error',
        );
      },
    });
  };

  const onSubmit = () => {
    const missing = order.length - answeredCount;
    if (missing > 0) {
      Alert.alert(
        `${missing} unanswered`,
        `You haven’t answered ${missing === 1 ? 'one question' : `${missing} questions`}. Submit anyway?`,
        [
          { text: 'Keep answering', style: 'cancel' },
          { text: 'Submit', onPress: doSubmit },
        ],
      );
      return;
    }
    doSubmit();
  };

  const close = () => router.back();

  // ── Header ──
  const title =
    phase === 'result' ? 'Quiz result' : quiz?.title ?? (quizQ.isLoading ? '' : 'Quiz');
  const header = (
    <View style={{ paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.two,
          height: 56,
        }}
      >
        <IconButton icon={<X size={22} color={theme.colors.foreground} />} label="Close quiz" onPress={close} />
        <Text variant="heading" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {title}
        </Text>
        <View style={{ width: 44, alignItems: 'center' }}>
          {phase === 'questions' ? (
            <Text variant="label" tone="muted">
              {page + 1} / {order.length}
            </Text>
          ) : null}
        </View>
      </View>
      {phase === 'questions' ? (
        <ProgressBar value={order.length ? (page + 1) / order.length : 0} height={4} />
      ) : (
        <View style={{ height: 1, backgroundColor: theme.colors.border }} />
      )}
    </View>
  );

  // ── States ──
  if (!lessonId || !courseId) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {header}
        <ErrorState title="This quiz can’t be opened" description="Open it from the lesson." />
      </View>
    );
  }
  if (quizQ.isError && !quizQ.data) {
    const code = (quizQ.error as { code?: string } | null)?.code;
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {header}
        <ErrorState
          title="Couldn’t load the quiz"
          description={friendlyError(code)}
          onRetry={() => void quizQ.refetch()}
        />
      </View>
    );
  }
  if (quizQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {header}
        <View style={{ padding: theme.spacing.four, gap: theme.spacing.three }}>
          <Skeleton width="70%" height={28} />
          <Skeleton width="90%" />
          <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flex: 1 }}>
                <Skeleton height={64} radius={10} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }
  if (!quiz || !quiz.questions.length) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {header}
        <EmptyState
          icon={<ListChecks size={28} color={theme.colors.mutedForeground} />}
          title="No questions yet"
          description="This quiz hasn’t been set up yet. Check back later."
          actionLabel="Back to lesson"
          onAction={close}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {header}
      {phase === 'intro' ? (
        <Intro
          quiz={quiz}
          attemptsUsed={attemptsUsed}
          attemptsLeft={attemptsLeft}
          latest={quizQ.data?.latestSubmission ?? null}
          onStart={start}
          onBack={close}
          bottomInset={insets.bottom}
          theme={theme}
        />
      ) : phase === 'questions' ? (
        <QuestionPage
          question={order[page]}
          index={page}
          total={order.length}
          selected={answers[order[page]?.id] ?? []}
          onToggle={(optionId) => toggle(order[page], optionId)}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(order.length - 1, p + 1))}
          onSubmit={onSubmit}
          submitting={submit.isPending}
          bottomInset={insets.bottom}
          theme={theme}
        />
      ) : result ? (
        <Result
          quiz={quiz}
          result={result}
          answers={answers}
          canRetry={attemptsLeft > 0}
          onRetry={start}
          onBack={close}
          bottomInset={insets.bottom}
          theme={theme}
        />
      ) : null}
    </View>
  );
}

function Intro({
  quiz,
  attemptsUsed,
  attemptsLeft,
  latest,
  onStart,
  onBack,
  bottomInset,
  theme,
}: {
  quiz: QuizInfo;
  attemptsUsed: number;
  attemptsLeft: number;
  latest: { scorePercent: number; passed: boolean; submittedAt: string } | null;
  onStart: () => void;
  onBack: () => void;
  bottomInset: number;
  theme: Theme;
}) {
  const noneLeft = attemptsLeft === 0;
  return (
    <>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.four, gap: theme.spacing.five }}>
        <View style={{ gap: theme.spacing.two }}>
          <Text variant="display">{quiz.title}</Text>
          {quiz.description ? <Text tone="muted">{quiz.description}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>
          <Stat value={String(quiz.questions.length)} label="Questions" theme={theme} />
          <Stat value={`${quiz.passingScorePercent}%`} label="To pass" theme={theme} />
          <Stat
            value={quiz.maxAttempts === 0 ? `${attemptsUsed} / ∞` : `${attemptsUsed} / ${quiz.maxAttempts}`}
            label="Attempts used"
            theme={theme}
          />
        </View>
        {latest ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
            <ProgressRing value={latest.scorePercent / 100} size={52} stroke={5} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong">Last attempt: {latest.scorePercent}%</Text>
              <Text variant="caption" tone="muted">
                {latest.passed ? 'Passed' : 'Not passed'} · {formatDate(latest.submittedAt)}
              </Text>
            </View>
            <Badge label={latest.passed ? 'Passed' : 'Failed'} tone={latest.passed ? 'success' : 'neutral'} />
          </Card>
        ) : null}
        {noneLeft ? (
          <Card style={{ flexDirection: 'row', gap: theme.spacing.three }}>
            <Info size={20} color={theme.colors.mutedForeground} />
            <Text tone="muted" style={{ flex: 1 }}>
              You’ve used every attempt for this quiz.
            </Text>
          </Card>
        ) : null}
      </ScrollView>
      <BottomBar bottomInset={bottomInset} theme={theme}>
        {noneLeft ? (
          <Button label="Back to lesson" onPress={onBack} />
        ) : (
          <Button
            label={latest ? 'Start new attempt' : 'Start'}
            iconRight={<ArrowRight size={18} color={theme.colors.primaryForeground} />}
            onPress={onStart}
          />
        )}
      </BottomBar>
    </>
  );
}

function Stat({ value, label, theme }: { value: string; label: string; theme: Theme }) {
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

function QuestionPage({
  question,
  index,
  total,
  selected,
  onToggle,
  onPrev,
  onNext,
  onSubmit,
  submitting,
  bottomInset,
  theme,
}: {
  question: QuizQuestionItem | undefined;
  index: number;
  total: number;
  selected: string[];
  onToggle: (optionId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitting: boolean;
  bottomInset: number;
  theme: Theme;
}) {
  if (!question) return null;
  const multi = question.type === 'multiple';
  const last = index === total - 1;
  return (
    <>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.four, gap: theme.spacing.four }}>
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: theme.spacing.three,
            paddingVertical: theme.spacing.one,
            borderRadius: theme.radius.full,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}
        >
          <Text variant="label" tone="muted">
            QUESTION {index + 1} · {typeHint(question.type)}
          </Text>
        </View>
        <Text variant="title">{question.prompt}</Text>
        <View style={{ gap: theme.spacing.three }} accessibilityRole={multi ? undefined : 'radiogroup'}>
          {question.options.map((opt) => {
            const isOn = selected.includes(opt.id);
            return (
              <Pressable
                key={opt.id}
                accessibilityRole={multi ? 'checkbox' : 'radio'}
                accessibilityState={multi ? { checked: isOn } : { selected: isOn }}
                onPress={() => onToggle(opt.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.three,
                  minHeight: 56,
                  padding: theme.spacing.four,
                  borderRadius: theme.radius.xl,
                  borderWidth: isOn ? 1.5 : 1,
                  borderColor: isOn ? theme.colors.foreground : theme.colors.border,
                  backgroundColor: isOn ? theme.colors.muted : theme.colors.card,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: multi ? theme.radius.sm : 12,
                    borderWidth: isOn ? 0 : 1.5,
                    borderColor: theme.colors.ring,
                    backgroundColor: isOn ? theme.colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isOn ? (
                    multi ? (
                      <Check size={16} color={theme.colors.primaryForeground} strokeWidth={3} />
                    ) : (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: theme.colors.primaryForeground,
                        }}
                      />
                    )
                  ) : null}
                </View>
                <Text style={{ flex: 1 }}>{opt.text}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <BottomBar bottomInset={bottomInset} theme={theme} row>
        <View style={{ flex: 1 }}>
          <Button label="Previous" variant="secondary" disabled={index === 0} onPress={onPrev} />
        </View>
        <View style={{ flex: 1 }}>
          {last ? (
            <Button label="Submit" loading={submitting} onPress={onSubmit} />
          ) : (
            <Button label="Next" onPress={onNext} />
          )}
        </View>
      </BottomBar>
    </>
  );
}

function Result({
  quiz,
  result,
  answers,
  canRetry,
  onRetry,
  onBack,
  bottomInset,
  theme,
}: {
  quiz: QuizInfo;
  result: QuizSubmitResult;
  answers: Answers;
  canRetry: boolean;
  onRetry: () => void;
  onBack: () => void;
  bottomInset: number;
  theme: Theme;
}) {
  const byId = useMemo(() => new Map(quiz.questions.map((q) => [q.id, q])), [quiz.questions]);
  const optionText = (qid: string, ids: string[]) => {
    const q = byId.get(qid);
    return ids.map((id) => q?.options.find((o) => o.id === id)?.text ?? id).join(' & ');
  };
  return (
    <>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.four, gap: theme.spacing.five }}>
        <View style={{ alignItems: 'center', gap: theme.spacing.three, paddingTop: theme.spacing.two }}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <ProgressRing value={result.scorePercent / 100} size={180} stroke={12} />
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <Text variant="display" style={{ fontSize: 40, lineHeight: 46 }}>
                {result.scorePercent}%
              </Text>
              <Text variant="tiny" tone="muted">
                SCORE
              </Text>
            </View>
          </View>
          <Badge label={result.passed ? 'Passed' : 'Not passed'} tone={result.passed ? 'success' : 'destructive'} />
          <Text tone="muted">
            {result.correctCount} of {result.totalQuestions} correct · Passing score{' '}
            {quiz.passingScorePercent}%
          </Text>
          {result.passed ? (
            <Text variant="caption" tone="muted">
              Lesson marked complete.
            </Text>
          ) : null}
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors.border }} />

        <View style={{ gap: theme.spacing.one }}>
          <Text variant="title">Review</Text>
          <Text tone="muted">
            {result.totalQuestions - result.correctCount === 0
              ? 'Every answer was right.'
              : `${result.totalQuestions - result.correctCount} to look at again`}
          </Text>
        </View>

        {result.feedback.map((f, i) => {
          const q = byId.get(f.questionId);
          const yours = answers[f.questionId] ?? [];
          return (
            <Card key={f.questionId} style={{ gap: theme.spacing.three }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
                {f.isCorrect ? (
                  <CircleCheck size={20} color={theme.colors.success} />
                ) : (
                  <CircleX size={20} color={theme.colors.destructive} />
                )}
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  Question {i + 1}
                </Text>
                {q ? <Badge label={typeLabel(q.type)} /> : null}
              </View>
              <Text>{f.prompt}</Text>
              <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>
                {f.isCorrect ? (
                  <Check size={16} color={theme.colors.success} style={{ marginTop: 3 }} />
                ) : (
                  <X size={16} color={theme.colors.destructive} style={{ marginTop: 3 }} />
                )}
                <Text style={{ flex: 1 }}>
                  <Text tone="muted">Your answer: </Text>
                  {yours.length ? (
                    <Text
                      weight="semibold"
                      tone={f.isCorrect ? 'default' : 'destructive'}
                      style={f.isCorrect ? undefined : { textDecorationLine: 'line-through' }}
                    >
                      {optionText(f.questionId, yours)}
                    </Text>
                  ) : (
                    <Text tone="muted">No answer</Text>
                  )}
                </Text>
              </View>
              {!f.isCorrect ? (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: theme.spacing.two,
                    padding: theme.spacing.three,
                    borderRadius: theme.radius.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.success,
                  }}
                >
                  <CircleCheck size={16} color={theme.colors.success} style={{ marginTop: 3 }} />
                  <Text style={{ flex: 1 }}>
                    <Text weight="semibold" tone="success">
                      Correct answer:{' '}
                    </Text>
                    {optionText(f.questionId, f.correctOptionIds)}
                  </Text>
                </View>
              ) : null}
              {f.explanation ? (
                <View
                  style={{
                    padding: theme.spacing.three,
                    borderRadius: theme.radius.lg,
                    backgroundColor: theme.colors.muted,
                  }}
                >
                  <Text variant="caption">
                    <Text variant="caption" weight="semibold">
                      Explanation:{' '}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {f.explanation}
                    </Text>
                  </Text>
                </View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
      <BottomBar bottomInset={bottomInset} theme={theme} row>
        {canRetry ? (
          <View style={{ flex: 1 }}>
            <Button
              label="Retry quiz"
              variant="secondary"
              iconLeft={<RotateCcw size={16} color={theme.colors.foreground} />}
              onPress={onRetry}
            />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button
            label="Back to lesson"
            iconRight={<ArrowRight size={16} color={theme.colors.primaryForeground} />}
            onPress={onBack}
          />
        </View>
      </BottomBar>
    </>
  );
}

function BottomBar({
  children,
  bottomInset,
  theme,
  row = false,
}: {
  children: React.ReactNode;
  bottomInset: number;
  theme: Theme;
  row?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: row ? 'row' : 'column',
        gap: theme.spacing.three,
        paddingHorizontal: theme.spacing.four,
        paddingTop: theme.spacing.three,
        paddingBottom: Math.max(bottomInset, theme.spacing.three),
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.background,
      }}
    >
      {children}
    </View>
  );
}
