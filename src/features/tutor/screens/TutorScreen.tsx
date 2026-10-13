/**
 * S17 — AI Tutor chat ("Ask Aion"). Matches `docs/design/S17-ai-tutor.png`,
 * without thumbs-up/down (no feedback endpoint; DESIGN.md), copy (no
 * clipboard module yet) or voice input.
 *
 * - Header: "Ask Aion", a context chip with the lesson title when opened from
 *   a lesson, and a menu with Clear history.
 * - User bubbles on the right; assistant replies on the left as markdown,
 *   growing while they stream.
 * - Empty state: three suggestion chips.
 * - Composer: multiline input and Send, which becomes Stop while streaming.
 * - A failed reply shows inline with Retry. The keyboard never covers the
 *   composer.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  ArrowUp,
  BookOpen,
  ChevronLeft,
  FileText,
  Lightbulb,
  ListChecks,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Square,
} from 'lucide-react-native';

import type { AiMessage } from '@/api/types';
import { Markdown } from '@/components/Markdown';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { formatTime } from '@/lib/format';
import { useTheme, type Theme } from '@/theme';

import { useClearHistory, useTutorChat, useTutorContext, type TutorFailure } from '../hooks';

const SUGGESTIONS = [
  { label: 'Explain this lesson simply', icon: Lightbulb },
  { label: 'Quiz me on this', icon: ListChecks },
  { label: 'Summarize key points', icon: FileText },
] as const;

type Row =
  | { kind: 'message'; message: AiMessage }
  | { kind: 'streaming'; text: string }
  | { kind: 'thinking' }
  | { kind: 'failed'; failure: TutorFailure };

export function TutorScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ courseId?: string; lessonId?: string }>();
  const courseId = typeof params.courseId === 'string' && params.courseId ? params.courseId : null;
  const lessonId = typeof params.lessonId === 'string' && params.lessonId ? params.lessonId : null;

  const context = useTutorContext(courseId, lessonId);
  const chat = useTutorChat({ courseId, lessonId, context });
  const clear = useClearHistory();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Row>>(null);

  const busy = chat.status === 'sending' || chat.status === 'streaming';

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = chat.messages
      .filter((m) => m.role !== 'system')
      .map((message) => ({ kind: 'message', message }));
    if (chat.status === 'streaming' && chat.streaming) list.push({ kind: 'streaming', text: chat.streaming });
    else if (busy) list.push({ kind: 'thinking' });
    if (chat.status === 'error' && chat.failure) list.push({ kind: 'failed', failure: chat.failure });
    return list;
  }, [chat.messages, chat.status, chat.streaming, chat.failure, busy]);

  useEffect(() => {
    if (rows.length) requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [rows.length, chat.streaming]);

  const onSend = (text: string) => {
    if (!text.trim() || busy) return;
    setDraft('');
    void chat.send(text);
  };

  const onMenu = () =>
    Alert.alert('Ask Aion', undefined, [
      {
        text: 'Clear history',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Clear chat history?', 'This deletes every message with Ask Aion.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear',
              style: 'destructive',
              onPress: () =>
                clear.mutate(undefined, {
                  onError: () => showToast('Couldn’t clear the history.', 'error'),
                }),
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const empty = !chat.historyQ.isLoading && rows.length === 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior="padding"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.two,
          paddingTop: insets.top + theme.spacing.two,
          paddingHorizontal: theme.spacing.four,
          paddingBottom: theme.spacing.three,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <IconButton
          icon={<ChevronLeft size={22} color={theme.colors.foreground} />}
          label="Back"
          variant="muted"
          onPress={() => router.back()}
        />
        <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.one }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
            <Sparkles size={18} color={theme.colors.foreground} />
            <Text variant="heading">Ask Aion</Text>
          </View>
          {context.lessonTitle ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                maxWidth: '100%',
                paddingHorizontal: theme.spacing.three,
                paddingVertical: 2,
                borderRadius: theme.radius.full,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.muted,
              }}
            >
              <BookOpen size={12} color={theme.colors.mutedForeground} />
              <Text variant="caption" tone="muted" numberOfLines={1}>
                About: {context.lessonTitle}
              </Text>
            </View>
          ) : null}
        </View>
        <IconButton
          icon={<MoreHorizontal size={20} color={theme.colors.foreground} />}
          label="Chat options"
          variant="muted"
          onPress={onMenu}
        />
      </View>

      {chat.historyQ.isError && !chat.historyQ.data ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorState
            title="Couldn’t load your chat"
            description="Check your connection and try again."
            onRetry={() => void chat.historyQ.refetch()}
          />
        </View>
      ) : chat.historyQ.isLoading ? (
        <View style={{ flex: 1, padding: theme.spacing.four, gap: theme.spacing.five }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Skeleton width="60%" height={48} radius={18} />
          </View>
          <Skeleton width="85%" height={120} radius={18} />
          <View style={{ alignItems: 'flex-end' }}>
            <Skeleton width="45%" height={48} radius={18} />
          </View>
        </View>
      ) : empty ? (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.six,
            gap: theme.spacing.three,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: theme.colors.muted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={26} color={theme.colors.foreground} />
          </View>
          <Text variant="heading" style={{ textAlign: 'center' }}>
            {context.lessonTitle ? 'Ask anything about this lesson' : 'Ask Aion anything'}
          </Text>
          <Text tone="muted" style={{ textAlign: 'center' }}>
            Your tutor knows your courses and can explain, quiz or summarize.
          </Text>
          <View style={{ gap: theme.spacing.two, alignSelf: 'stretch', marginTop: theme.spacing.three }}>
            {SUGGESTIONS.map(({ label, icon: Icon }) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                onPress={() => onSend(label)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.three,
                  minHeight: 48,
                  paddingHorizontal: theme.spacing.four,
                  borderRadius: theme.radius.full,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon size={18} color={theme.colors.foreground} />
                <Text>{label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r, i) => (r.kind === 'message' ? r.message.id : `${r.kind}-${i}`)}
          contentContainerStyle={{ padding: theme.spacing.four, gap: theme.spacing.four }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          renderItem={({ item }) => (
            <ChatRow
              row={item}
              onRetry={chat.retry}
              onEditProfile={() => router.push('/(app)/profile/edit' as Href)}
              theme={theme}
            />
          )}
        />
      )}

      {!empty && !busy && rows.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            gap: theme.spacing.two,
            paddingHorizontal: theme.spacing.four,
            paddingBottom: theme.spacing.two,
          }}
        >
          {SUGGESTIONS.map(({ label, icon: Icon }) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              onPress={() => onSend(label)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.two,
                height: 40,
                paddingHorizontal: theme.spacing.four,
                borderRadius: theme.radius.full,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon size={16} color={theme.colors.foreground} />
              <Text variant="label">{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.spacing.two,
          marginHorizontal: theme.spacing.four,
          marginBottom: Math.max(insets.bottom, theme.spacing.three),
          paddingLeft: theme.spacing.four,
          paddingRight: theme.spacing.one,
          paddingVertical: theme.spacing.one,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.muted,
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={context.lessonTitle ? 'Ask anything about this lesson…' : 'Ask Aion anything…'}
          placeholderTextColor={theme.colors.mutedForeground}
          multiline
          maxLength={5000}
          accessibilityLabel="Message"
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 140,
            paddingVertical: theme.spacing.three,
            color: theme.colors.foreground,
            fontFamily: theme.fonts.regular,
            fontSize: theme.typography.body.fontSize,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={chat.status === 'streaming' ? 'Stop' : 'Send'}
          disabled={chat.status === 'sending' || (chat.status !== 'streaming' && !draft.trim())}
          onPress={() => (chat.status === 'streaming' ? chat.stop() : onSend(draft))}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              chat.status === 'streaming' || draft.trim() ? theme.colors.primary : theme.colors.border,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {chat.status === 'sending' ? (
            <ActivityIndicator color={theme.colors.primaryForeground} />
          ) : chat.status === 'streaming' ? (
            <Square size={16} color={theme.colors.primaryForeground} fill={theme.colors.primaryForeground} />
          ) : (
            <ArrowUp size={20} color={draft.trim() ? theme.colors.primaryForeground : theme.colors.mutedForeground} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function ChatRow({
  row,
  onRetry,
  onEditProfile,
  theme,
}: {
  row: Row;
  onRetry: () => void;
  onEditProfile: () => void;
  theme: Theme;
}) {
  if (row.kind === 'message' && row.message.role === 'user') {
    return (
      <View style={{ alignItems: 'flex-end', gap: theme.spacing.one }}>
        <View
          style={{
            maxWidth: '85%',
            paddingHorizontal: theme.spacing.four,
            paddingVertical: theme.spacing.three,
            borderRadius: 20,
            borderBottomRightRadius: theme.radius.sm,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text selectable style={{ color: theme.colors.primaryForeground }}>
            {row.message.content}
          </Text>
        </View>
        {row.message.id.startsWith('temp-') ? null : (
          <Text variant="tiny" tone="muted">
            {formatTime(row.message.createdAt)}
          </Text>
        )}
      </View>
    );
  }

  if (row.kind === 'failed') {
    const aiOff = ['AI_DISABLED', 'AI_CONSENT_REQUIRED', 'FORBIDDEN'].includes(row.failure.code ?? '');
    return (
      <AssistantShell theme={theme}>
        <View style={{ gap: theme.spacing.two }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
            <AlertCircle size={18} color={theme.colors.destructive} />
            <Text variant="bodyStrong" tone="destructive">
              {aiOff ? 'AI features are turned off' : 'Couldn’t get a reply'}
            </Text>
          </View>
          <Text variant="caption" tone="muted">
            {aiOff
              ? 'Turn them back on in your profile to chat with Aion.'
              : friendlyError(row.failure.code)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={aiOff ? onEditProfile : onRetry}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.two,
              minHeight: 36,
              paddingHorizontal: theme.spacing.three,
              borderRadius: theme.radius.full,
              borderWidth: 1,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {aiOff ? null : <RotateCcw size={14} color={theme.colors.foreground} />}
            <Text variant="label">{aiOff ? 'Edit profile' : 'Retry'}</Text>
          </Pressable>
        </View>
      </AssistantShell>
    );
  }

  if (row.kind === 'thinking') {
    return (
      <AssistantShell theme={theme}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
          <ActivityIndicator size="small" color={theme.colors.mutedForeground} />
          <Text variant="caption" tone="muted">
            Thinking…
          </Text>
        </View>
      </AssistantShell>
    );
  }

  const text = row.kind === 'streaming' ? row.text : row.message.content;
  return (
    <AssistantShell theme={theme}>
      <Markdown value={text} />
    </AssistantShell>
  );
}

function AssistantShell({ children, theme }: { children: React.ReactNode; theme: Theme }) {
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.three, alignItems: 'flex-start' }}>
      <View
        accessibilityLabel="Aion"
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="label" style={{ color: theme.colors.primaryForeground }}>
          A
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          paddingHorizontal: theme.spacing.four,
          paddingVertical: theme.spacing.three,
          borderRadius: 20,
          borderTopLeftRadius: theme.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
        }}
      >
        {children}
      </View>
    </View>
  );
}
