/**
 * S14 — AI summary sheet (formSheet over S12). The Flashcards tab matches
 * `docs/design/S14-ai-summary-sheet.png`; Summary and Concepts aren't
 * designed and follow the same visual language. The design's "Review later" /
 * "I know this" buttons and bookmark aren't built: nothing stores them.
 *
 * - Summary: the executive summary and key takeaways.
 * - Concepts: term + definition; a concept with `timestampSeconds` seeks the
 *   lesson video when tapped.
 * - Flashcards: swipe between cards, tap to flip (a short Reanimated turn,
 *   instant with Reduce Motion), optional hint.
 * - Empty state for an `unavailable-` summary; a respectful message when AI
 *   is turned off or the server refuses.
 */
import { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Lightbulb,
  Play,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react-native';

import type { AiSummary } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { friendlyError } from '@/lib/errors';
import { formatClock } from '@/lib/format';
import { useTheme, type Theme } from '@/theme';

import { playback } from '../playback';
import { useLesson, useLessonSummary } from '../player-hooks';

type Tab = 'summary' | 'concepts' | 'flashcards';

const TABS = [
  { value: 'summary', label: 'Summary' },
  { value: 'concepts', label: 'Concepts' },
  { value: 'flashcards', label: 'Flashcards' },
] as const;

const AI_OFF_CODES = new Set(['AI_DISABLED', 'AI_CONSENT_REQUIRED', 'FORBIDDEN']);

export function SummarySheet() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = typeof id === 'string' ? id : null;
  const lessonQ = useLesson(lessonId);
  const lesson = lessonQ.data;
  const summaryQ = useLessonSummary(lessonId, lesson?.courseId, lesson?.title);
  const [tab, setTab] = useState<Tab>('summary');

  const summary = summaryQ.data;
  const unavailable = !!summary && summary.id.startsWith('unavailable-');
  const errorCode = (summaryQ.error as { code?: string } | null)?.code;

  let body: React.ReactNode;
  if (summaryQ.isError && !summary) {
    body = AI_OFF_CODES.has(errorCode ?? '') ? (
      <EmptyState
        icon={<Sparkles size={28} color={theme.colors.mutedForeground} />}
        title="AI features are turned off"
        description="You can turn them back on in your profile settings."
        actionLabel="Edit profile"
        onAction={() => router.push('/(app)/profile/edit' as Href)}
      />
    ) : (
      <ErrorState
        title="Couldn’t load the summary"
        description={friendlyError(errorCode)}
        onRetry={() => void summaryQ.refetch()}
      />
    );
  } else if (!summary) {
    body = <SummarySkeleton theme={theme} />;
  } else if (unavailable) {
    body = (
      <EmptyState
        icon={<Sparkles size={28} color={theme.colors.mutedForeground} />}
        title="Summary not available yet"
        description="We couldn’t generate a summary for this lesson. Try again later."
        actionLabel="Try again"
        onAction={() => void summaryQ.refetch()}
      />
    );
  } else if (tab === 'summary') {
    body = <SummaryTab summary={summary} theme={theme} />;
  } else if (tab === 'concepts') {
    body = <ConceptsTab summary={summary} lessonId={lessonId ?? ''} theme={theme} />;
  } else {
    body = <FlashcardsTab summary={summary} theme={theme} />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingBottom: insets.bottom,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.three,
          paddingHorizontal: theme.spacing.four,
          paddingTop: theme.spacing.five,
          paddingBottom: theme.spacing.three,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={18} color={theme.colors.foreground} />
        </View>
        <Text variant="title" style={{ flex: 1 }}>
          AI summary
        </Text>
        <IconButton
          icon={<X size={20} color={theme.colors.foreground} />}
          label="Close summary"
          variant="muted"
          onPress={() => router.back()}
        />
      </View>
      {summary && !unavailable ? (
        <View style={{ paddingHorizontal: theme.spacing.four, paddingBottom: theme.spacing.three }}>
          <SegmentedControl options={TABS} value={tab} onChange={setTab} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>{body}</View>
    </View>
  );
}

function SummaryTab({ summary, theme }: { summary: AiSummary; theme: Theme }) {
  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.four, gap: theme.spacing.five }}>
      <Text>{summary.executiveSummary}</Text>
      {summary.keyTakeaways.length ? (
        <View style={{ gap: theme.spacing.three }}>
          <Text variant="heading">Key takeaways</Text>
          {summary.keyTakeaways.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.three }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  marginTop: 8,
                  backgroundColor: theme.colors.foreground,
                }}
              />
              <Text style={{ flex: 1 }}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function ConceptsTab({
  summary,
  lessonId,
  theme,
}: {
  summary: AiSummary;
  lessonId: string;
  theme: Theme;
}) {
  const canSeek = playback.canSeek(lessonId);
  if (!summary.concepts.length) {
    return <EmptyState title="No concepts for this lesson" />;
  }
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.four, paddingBottom: theme.spacing.six }}>
      {summary.concepts.map((c, i) => {
        const seekable = canSeek && typeof c.timestampSeconds === 'number';
        return (
          <Pressable
            key={`${c.term}-${i}`}
            disabled={!seekable}
            accessibilityRole={seekable ? 'button' : undefined}
            accessibilityHint={seekable ? 'Jumps to this moment in the video' : undefined}
            onPress={() => {
              if (seekable && playback.seek(lessonId, c.timestampSeconds ?? 0)) router.back();
            }}
            style={({ pressed }) => ({
              paddingVertical: theme.spacing.four,
              gap: theme.spacing.one,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: theme.colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {c.term}
              </Text>
              {typeof c.timestampSeconds === 'number' ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: theme.spacing.two,
                    height: 24,
                    borderRadius: theme.radius.md,
                    backgroundColor: seekable ? theme.colors.primary : theme.colors.muted,
                  }}
                >
                  <Play
                    size={10}
                    color={seekable ? theme.colors.primaryForeground : theme.colors.mutedForeground}
                    fill={seekable ? theme.colors.primaryForeground : theme.colors.mutedForeground}
                  />
                  <Text
                    variant="tiny"
                    style={{
                      color: seekable ? theme.colors.primaryForeground : theme.colors.mutedForeground,
                    }}
                  >
                    {formatClock(c.timestampSeconds)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text tone="muted">{c.definition}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function FlashcardsTab({ summary, theme }: { summary: AiSummary; theme: Theme }) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<AiSummary['flashcards'][number]>>(null);
  const [index, setIndex] = useState(0);
  const cards = summary.flashcards;
  const pageWidth = width; // the sheet spans the window width

  if (!cards.length) return <EmptyState title="No flashcards for this lesson" />;

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(cards.length - 1, i));
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  return (
    <View style={{ flex: 1, gap: theme.spacing.four }}>
      <FlatList
        ref={listRef}
        data={cards}
        keyExtractor={(c) => c.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth))}
        renderItem={({ item, index: i }) => (
          <View style={{ width: pageWidth, paddingHorizontal: theme.spacing.four }}>
            <Flashcard card={item} position={i + 1} total={cards.length} theme={theme} />
          </View>
        )}
        style={{ flexGrow: 0 }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <RefreshCw size={14} color={theme.colors.mutedForeground} />
        <Text variant="caption" tone="muted">
          Tap card to flip
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.six,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous card"
          disabled={index === 0}
          onPress={() => goTo(index - 1)}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: index === 0 ? 0.4 : 1,
          }}
        >
          <ChevronLeft size={22} color={theme.colors.foreground} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {cards.map((c, i) => (
            <View
              key={c.id}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? theme.colors.primary : theme.colors.border,
              }}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next card"
          disabled={index === cards.length - 1}
          onPress={() => goTo(index + 1)}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: index === cards.length - 1 ? 0.4 : 1,
          }}
        >
          <ChevronRight size={22} color={theme.colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
}

function Flashcard({
  card,
  position,
  total,
  theme,
}: {
  card: AiSummary['flashcards'][number];
  position: number;
  total: number;
  theme: Theme;
}) {
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0); // 0 = front, 1 = back
  const [flipped, setFlipped] = useState(false);

  const flip = () => {
    const next = !flipped;
    setFlipped(next);
    turn.set(reduceMotion ? (next ? 1 : 0) : withTiming(next ? 1 : 0, { duration: 250 }));
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(turn.value, [0, 1], [0, 180])}deg` }],
    opacity: turn.value < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(turn.value, [0, 1], [180, 360])}deg` }],
    opacity: turn.value >= 0.5 ? 1 : 0,
  }));

  const face = {
    position: 'absolute' as const,
    inset: 0,
    backfaceVisibility: 'hidden' as const,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.five,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={flipped ? `Answer: ${card.back}` : `Question: ${card.front}`}
      accessibilityHint="Flips the card"
      onPress={flip}
      style={{ height: 320 }}
    >
      <Animated.View style={[face, frontStyle]}>
        <CardChip position={position} total={total} theme={theme} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.three }}>
          <Text variant="label" tone="muted">
            QUESTION
          </Text>
          <Text variant="title" style={{ textAlign: 'center' }}>
            {card.front}
          </Text>
        </View>
        {card.hint ? (
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.two,
              paddingTop: theme.spacing.three,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <Lightbulb size={16} color={theme.colors.mutedForeground} />
            <Text variant="caption" tone="muted" numberOfLines={2} style={{ flex: 1 }}>
              Hint: {card.hint}
            </Text>
          </View>
        ) : null}
      </Animated.View>
      <Animated.View style={[face, backStyle]}>
        <CardChip position={position} total={total} theme={theme} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.three }}>
          <Text variant="label" tone="muted">
            ANSWER
          </Text>
          <Text variant="heading" style={{ textAlign: 'center' }}>
            {card.back}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function CardChip({ position, total, theme }: { position: number; total: number; theme: Theme }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: theme.spacing.three,
        height: 28,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.muted,
      }}
    >
      <Layers size={14} color={theme.colors.mutedForeground} />
      <Text variant="caption" tone="muted">
        Card {position} of {total}
      </Text>
    </View>
  );
}

function SummarySkeleton({ theme }: { theme: Theme }) {
  return (
    <View style={{ padding: theme.spacing.four, gap: theme.spacing.three }}>
      <Skeleton width="100%" height={40} radius={20} />
      <Skeleton width="95%" />
      <Skeleton width="90%" />
      <Skeleton width="70%" />
      <Skeleton width="40%" height={20} />
      <Skeleton width="85%" />
      <Skeleton width="80%" />
      <Button label="Generating summary…" variant="secondary" loading disabled />
    </View>
  );
}
