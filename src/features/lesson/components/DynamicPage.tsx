/**
 * Native renderer for `dynamic_page` blocks (API §4). `lib/lesson.ts` has
 * already dropped unknown or malformed blocks. An inline quiz is graded on the
 * device; a correct answer calls `onCorrectAnswer` (the lesson marks itself
 * complete, as on the web).
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheck,
  CircleX,
  ExternalLink,
  Info,
  Lightbulb,
  OctagonAlert,
} from 'lucide-react-native';

import type { DynamicBlock } from '@/api/types';
import { Markdown, MONO_FONT } from '@/components/Markdown';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { videoSource } from '@/lib/lesson';
import { useTheme, type Theme } from '@/theme';

import { EmbedFrame } from './EmbedFrame';
import { LessonVideo } from './LessonVideo';

type BlockOf<T extends DynamicBlock['type']> = Extract<DynamicBlock, { type: T }>;

export interface DynamicPageProps {
  lessonId: string;
  blocks: DynamicBlock[];
  onCorrectAnswer?: () => void;
}

export function DynamicPage({ lessonId, blocks, onCorrectAnswer }: DynamicPageProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.five }}>
      {blocks.map((block) => (
        <Block key={block.id} lessonId={lessonId} block={block} onCorrectAnswer={onCorrectAnswer} />
      ))}
    </View>
  );
}

function Block({
  lessonId,
  block,
  onCorrectAnswer,
}: {
  lessonId: string;
  block: DynamicBlock;
  onCorrectAnswer?: () => void;
}) {
  const theme = useTheme();
  switch (block.type) {
    case 'hero':
      return <HeroBlock block={block} theme={theme} />;
    case 'typography':
      return <Markdown value={block.data.content ?? ''} />;
    case 'code':
      return <CodeBlock block={block} theme={theme} />;
    case 'callout':
      return <CalloutBlock block={block} theme={theme} />;
    case 'video': {
      const source = videoSource(block.data.videoUrl);
      if (!source) return null;
      return (
        <View style={{ gap: theme.spacing.two }}>
          {block.data.title ? <Text variant="bodyStrong">{block.data.title}</Text> : null}
          <View style={{ borderRadius: theme.radius.lg, overflow: 'hidden' }}>
            <LessonVideo lessonId={lessonId} source={source} resumeAt={0} trackProgress={false} />
          </View>
          {block.data.caption ? (
            <Text variant="caption" tone="muted">
              {block.data.caption}
            </Text>
          ) : null}
        </View>
      );
    }
    case 'quiz':
      return <QuizBlock block={block} theme={theme} onCorrect={onCorrectAnswer} />;
    case 'tabs':
      return <TabsBlock block={block} theme={theme} />;
    case 'accordion':
      return <AccordionBlock block={block} theme={theme} />;
    case 'stepper':
      return <StepperBlock block={block} theme={theme} />;
    case 'resource':
      return (
        <Card style={{ gap: theme.spacing.two }}>
          <Text variant="bodyStrong">{block.data.title}</Text>
          {block.data.description ? (
            <Text variant="caption" tone="muted">
              {block.data.description}
            </Text>
          ) : null}
          <Button
            label={block.data.buttonLabel || 'Open'}
            variant="secondary"
            size="sm"
            fullWidth={false}
            style={{ alignSelf: 'flex-start' }}
            iconRight={<ExternalLink size={14} color={theme.colors.foreground} />}
            onPress={() => void WebBrowser.openBrowserAsync(block.data.fileUrl)}
          />
        </Card>
      );
    case 'embed': {
      const height = Number(block.data.height) || 360;
      return (
        <View style={{ gap: theme.spacing.two }}>
          {block.data.title ? <Text variant="bodyStrong">{block.data.title}</Text> : null}
          <EmbedFrame
            url={block.data.embedUrl}
            title={block.data.title}
            style={{
              height,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          />
        </View>
      );
    }
    case 'glossary':
      return (
        <Card padded={false}>
          {block.data.terms.map((t, i) => (
            <View
              key={`${t.term}-${i}`}
              style={{
                padding: theme.spacing.four,
                gap: 2,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <Text variant="bodyStrong">{t.term}</Text>
              <Text variant="caption" tone="muted">
                {t.definition}
              </Text>
            </View>
          ))}
        </Card>
      );
    case 'image':
      return (
        <View style={{ gap: theme.spacing.two }}>
          <Image
            source={{ uri: block.data.imageUrl }}
            style={{
              width: '100%',
              aspectRatio: 16 / 9,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.muted,
            }}
            contentFit="cover"
            accessibilityLabel={block.data.caption ?? 'Lesson image'}
          />
          {block.data.caption ? (
            <Text variant="caption" tone="muted">
              {block.data.caption}
            </Text>
          ) : null}
        </View>
      );
    case 'checklist':
      return <ChecklistBlock block={block} theme={theme} />;
    default:
      return null;
  }
}

function HeroBlock({ block, theme }: { block: BlockOf<'hero'>; theme: Theme }) {
  const { badge, heading, subtitle, readingTime, learningGoals } = block.data;
  return (
    <View style={{ gap: theme.spacing.two }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.two, alignItems: 'center' }}>
        {badge ? <Badge label={badge} /> : null}
        {readingTime ? (
          <Text variant="caption" tone="muted">
            {readingTime}
          </Text>
        ) : null}
      </View>
      {heading ? <Text variant="title">{heading}</Text> : null}
      {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
      {learningGoals?.length ? (
        <Card style={{ gap: theme.spacing.two, marginTop: theme.spacing.two }}>
          <Text variant="label" tone="muted">
            YOU’LL LEARN
          </Text>
          {learningGoals.map((g, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.two }}>
              <CheckCircle2 size={18} color={theme.colors.foreground} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1 }}>{g}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function CodeBlock({ block, theme }: { block: BlockOf<'code'>; theme: Theme }) {
  const { title, language, code, output } = block.data;
  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.muted,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.three,
          paddingVertical: theme.spacing.two,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Text variant="caption" tone="muted">
          {title || 'Code'}
        </Text>
        <Text variant="caption" tone="muted">
          {language}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text
          selectable
          style={{ fontFamily: MONO_FONT, fontSize: 13, lineHeight: 19, padding: theme.spacing.three }}
        >
          {code}
        </Text>
      </ScrollView>
      {output ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            padding: theme.spacing.three,
            gap: 2,
          }}
        >
          <Text variant="tiny" tone="muted">
            OUTPUT
          </Text>
          <Text selectable style={{ fontFamily: MONO_FONT, fontSize: 13, lineHeight: 19 }}>
            {output}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function CalloutBlock({ block, theme }: { block: BlockOf<'callout'>; theme: Theme }) {
  const { style, title, message } = block.data;
  const color =
    style === 'danger'
      ? theme.colors.destructive
      : style === 'warning'
        ? theme.colors.warning
        : style === 'success'
          ? theme.colors.success
          : theme.colors.foreground;
  const Icon =
    style === 'danger'
      ? OctagonAlert
      : style === 'warning'
        ? AlertTriangle
        : style === 'success'
          ? CircleCheck
          : style === 'tip'
            ? Lightbulb
            : Info;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: theme.spacing.three,
        padding: theme.spacing.four,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.muted,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Icon size={20} color={color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text variant="bodyStrong">{title}</Text> : null}
        <Markdown value={message} compact />
      </View>
    </View>
  );
}

function QuizBlock({
  block,
  theme,
  onCorrect,
}: {
  block: BlockOf<'quiz'>;
  theme: Theme;
  onCorrect?: () => void;
}) {
  const { question, options, correctIndex, explanation } = block.data;
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === correctIndex;

  return (
    <Card style={{ gap: theme.spacing.three }}>
      <Text variant="label" tone="muted">
        CHECK YOURSELF
      </Text>
      <Text variant="bodyStrong">{question}</Text>
      <View style={{ gap: theme.spacing.two }}>
        {options.map((opt, i) => {
          const isPicked = picked === i;
          const showCorrect = answered && i === correctIndex;
          const showWrong = answered && isPicked && !correct;
          return (
            <Pressable
              key={i}
              disabled={answered && correct}
              accessibilityRole="radio"
              accessibilityState={{ selected: isPicked }}
              onPress={() => {
                setPicked(i);
                if (i === correctIndex) onCorrect?.();
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.three,
                padding: theme.spacing.three,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: showCorrect
                  ? theme.colors.success
                  : showWrong
                    ? theme.colors.destructive
                    : theme.colors.border,
                backgroundColor: isPicked ? theme.colors.muted : theme.colors.card,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              {showCorrect ? (
                <CircleCheck size={20} color={theme.colors.success} />
              ) : showWrong ? (
                <CircleX size={20} color={theme.colors.destructive} />
              ) : (
                <Circle size={20} color={theme.colors.mutedForeground} />
              )}
              <Text style={{ flex: 1 }}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {answered ? (
        <View style={{ gap: 2 }}>
          <Text variant="bodyStrong" tone={correct ? 'success' : 'destructive'}>
            {correct ? 'Correct!' : 'Not quite. Try another answer.'}
          </Text>
          {correct && explanation ? (
            <Text variant="caption" tone="muted">
              {explanation}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function TabsBlock({ block, theme }: { block: BlockOf<'tabs'>; theme: Theme }) {
  const [active, setActive] = useState(0);
  const tabs = block.data.tabs;
  if (!tabs.length) return null;
  return (
    <View style={{ gap: theme.spacing.three }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>
          {tabs.map((t, i) => (
            <Chip key={i} label={t.title} selected={i === active} onPress={() => setActive(i)} />
          ))}
        </View>
      </ScrollView>
      <Card>
        <Markdown value={tabs[Math.min(active, tabs.length - 1)].content} />
      </Card>
    </View>
  );
}

function AccordionBlock({ block, theme }: { block: BlockOf<'accordion'>; theme: Theme }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Card padded={false}>
      {block.data.items.map((item, i) => {
        const isOpen = open === i;
        return (
          <View
            key={i}
            style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.colors.border }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              onPress={() => setOpen(isOpen ? null : i)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: theme.spacing.four,
                gap: theme.spacing.three,
                minHeight: 44,
              }}
            >
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {item.title}
              </Text>
              {isOpen ? (
                <ChevronUp size={18} color={theme.colors.mutedForeground} />
              ) : (
                <ChevronDown size={18} color={theme.colors.mutedForeground} />
              )}
            </Pressable>
            {isOpen ? (
              <View style={{ paddingHorizontal: theme.spacing.four, paddingBottom: theme.spacing.four }}>
                <Markdown value={item.content} compact />
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

function StepperBlock({ block, theme }: { block: BlockOf<'stepper'>; theme: Theme }) {
  const steps = block.data.steps;
  return (
    <View style={{ gap: 0 }}>
      {steps.map((step, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.three }}>
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="label" style={{ color: theme.colors.primaryForeground }}>
                {i + 1}
              </Text>
            </View>
            {i < steps.length - 1 ? (
              <View style={{ width: 2, flex: 1, backgroundColor: theme.colors.border }} />
            ) : null}
          </View>
          <View style={{ flex: 1, paddingBottom: theme.spacing.four, gap: 2 }}>
            <Text variant="bodyStrong">{step.title}</Text>
            <Text variant="caption" tone="muted">
              {step.description}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ChecklistBlock({ block, theme }: { block: BlockOf<'checklist'>; theme: Theme }) {
  const [done, setDone] = useState<Set<number>>(() => new Set());
  return (
    <Card style={{ gap: theme.spacing.one }}>
      {block.data.items.map((item, i) => {
        const checked = done.has(i);
        return (
          <Pressable
            key={i}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            onPress={() =>
              setDone((prev) => {
                const next = new Set(prev);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              })
            }
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three, minHeight: 44 }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: theme.radius.sm,
                borderWidth: 1.5,
                borderColor: checked ? theme.colors.primary : theme.colors.ring,
                backgroundColor: checked ? theme.colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {checked ? <Check size={14} color={theme.colors.primaryForeground} /> : null}
            </View>
            <Text
              style={{
                flex: 1,
                textDecorationLine: checked ? 'line-through' : 'none',
                color: checked ? theme.colors.mutedForeground : theme.colors.foreground,
              }}
            >
              {item}
            </Text>
          </Pressable>
        );
      })}
    </Card>
  );
}
