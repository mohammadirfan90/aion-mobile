/**
 * S13 — Notes sheet (formSheet over S12). Matches
 * `docs/design/S13-notes-sheet.png`, without the `#` tag button (notes have
 * no tags; DESIGN.md).
 *
 * - Notes for this lesson, oldest first: a `mm:ss` chip (video notes), the
 *   text and the date. Long-press or `⋯` deletes, after a confirmation.
 * - Tapping a chip seeks the lesson video and closes the sheet.
 * - The composer stamps new notes with the current playback time when the
 *   lesson has a native video. Adding is optimistic.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, MoreHorizontal, NotebookPen, Play, Timer, X } from 'lucide-react-native';

import type { LessonNote } from '@/api/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { formatClock, formatDayTime } from '@/lib/format';
import { useTheme, type Theme } from '@/theme';

import { playback } from '../playback';
import { useAddNote, useDeleteNote, useLesson, useLessonNotes } from '../player-hooks';

const MAX_NOTE = 2000;

export function NotesSheet() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = typeof id === 'string' ? id : null;

  const lessonQ = useLesson(lessonId);
  const notesQ = useLessonNotes(lessonId);
  const addNote = useAddNote(lessonId);
  const deleteNote = useDeleteNote(lessonId);

  const [draft, setDraft] = useState('');
  const canSeek = lessonId ? playback.canSeek(lessonId) : false;
  const [now, setNow] = useState<number | null>(() => (lessonId ? playback.time(lessonId) : null));

  // Keep the composer's time chip in step with the (still playing) video.
  useEffect(() => {
    if (!lessonId || !canSeek) return;
    const t = setInterval(() => setNow(playback.time(lessonId)), 1000);
    return () => clearInterval(t);
  }, [lessonId, canSeek]);

  const notes = notesQ.data ?? [];
  const lesson = lessonQ.data;

  const onAdd = () => {
    const content = draft.trim();
    if (!content || !lessonId || !lesson) return;
    setDraft('');
    addNote.mutate(
      {
        lessonId,
        courseId: lesson.courseId,
        content,
        timestampSeconds: canSeek && now !== null ? Math.floor(now) : null,
      },
      {
        onError: () => {
          setDraft(content);
          showToast('Couldn’t save your note. Try again.', 'error');
        },
      },
    );
  };

  const onDelete = (note: LessonNote) => {
    Alert.alert('Delete note?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteNote.mutate(note.id, {
            onError: () => showToast('Couldn’t delete the note.', 'error'),
          }),
      },
    ]);
  };

  const onSeek = (seconds: number) => {
    if (lessonId && playback.seek(lessonId, seconds)) router.back();
    else showToast('Open the video to jump to this moment.', 'info');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.two,
          paddingHorizontal: theme.spacing.four,
          paddingTop: theme.spacing.five,
          paddingBottom: theme.spacing.three,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Text variant="title">Notes</Text>
        {notes.length ? (
          <View
            style={{
              minWidth: 28,
              paddingHorizontal: theme.spacing.two,
              height: 24,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.muted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="label">{notes.length}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <IconButton
          icon={<X size={20} color={theme.colors.foreground} />}
          label="Close notes"
          variant="muted"
          onPress={() => router.back()}
        />
      </View>

      {notesQ.isError && !notesQ.data ? (
        <ErrorState
          title="Couldn’t load your notes"
          description="Check your connection and try again."
          onRetry={() => void notesQ.refetch()}
        />
      ) : notesQ.isLoading ? (
        <View style={{ padding: theme.spacing.four, gap: theme.spacing.five }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.three }}>
              <Skeleton width={64} height={28} radius={8} />
              <View style={{ flex: 1, gap: theme.spacing.two }}>
                <Skeleton width="95%" />
                <Skeleton width="70%" />
                <Skeleton width={90} height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={notes.length ? undefined : { flexGrow: 1, justifyContent: 'center' }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: theme.colors.border }} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<NotebookPen size={28} color={theme.colors.mutedForeground} />}
              title="No notes yet"
              description={
                canSeek
                  ? 'Notes you add are stamped with the video time.'
                  : 'Write down anything worth remembering.'
              }
            />
          }
          renderItem={({ item }) => (
            <NoteRow
              note={item}
              pending={item.id.startsWith('temp-')}
              onSeek={onSeek}
              onDelete={() => onDelete(item)}
              theme={theme}
            />
          )}
        />
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.spacing.two,
          paddingHorizontal: theme.spacing.four,
          paddingTop: theme.spacing.three,
          paddingBottom: Math.max(insets.bottom, theme.spacing.three),
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.two,
            minHeight: 48,
            paddingLeft: canSeek ? theme.spacing.two : theme.spacing.four,
            paddingRight: theme.spacing.four,
            borderRadius: theme.radius.full,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}
        >
          {canSeek ? (
            <TimeChip icon="timer" seconds={now ?? 0} theme={theme} />
          ) : null}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={canSeek ? `Add a note at ${formatClock(now)}…` : 'Add a note…'}
            placeholderTextColor={theme.colors.mutedForeground}
            maxLength={MAX_NOTE}
            multiline
            accessibilityLabel="New note"
            style={{
              flex: 1,
              color: theme.colors.foreground,
              fontFamily: theme.fonts.regular,
              fontSize: theme.typography.body.fontSize,
              paddingVertical: theme.spacing.three,
              maxHeight: 120,
            }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add note"
          accessibilityState={{ disabled: !draft.trim() || !lesson }}
          disabled={!draft.trim() || !lesson}
          onPress={onAdd}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: theme.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: draft.trim() ? theme.colors.primary : theme.colors.muted,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <ArrowUp
            size={22}
            color={draft.trim() ? theme.colors.primaryForeground : theme.colors.mutedForeground}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function NoteRow({
  note,
  pending,
  onSeek,
  onDelete,
  theme,
}: {
  note: LessonNote;
  pending: boolean;
  onSeek: (s: number) => void;
  onDelete: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      onLongPress={pending ? undefined : onDelete}
      accessibilityHint="Long-press to delete"
      style={{
        flexDirection: 'row',
        gap: theme.spacing.three,
        padding: theme.spacing.four,
        opacity: pending ? 0.6 : 1,
      }}
    >
      {note.timestampSeconds !== null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Jump to ${formatClock(note.timestampSeconds)}`}
          onPress={() => onSeek(note.timestampSeconds ?? 0)}
          hitSlop={8}
        >
          <TimeChip icon="play" seconds={note.timestampSeconds} theme={theme} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, gap: theme.spacing.two }}>
        <Text selectable>{note.content}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>
            {pending ? 'Saving…' : formatDayTime(note.createdAt)}
          </Text>
          {pending ? null : (
            <IconButton
              icon={<MoreHorizontal size={18} color={theme.colors.mutedForeground} />}
              label="Delete note"
              size={32}
              onPress={onDelete}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function TimeChip({
  icon,
  seconds,
  theme,
}: {
  icon: 'play' | 'timer';
  seconds: number;
  theme: Theme;
}) {
  const Icon = icon === 'play' ? Play : Timer;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 28,
        paddingHorizontal: theme.spacing.two,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.primary,
      }}
    >
      <Icon size={12} color={theme.colors.primaryForeground} fill={icon === 'play' ? theme.colors.primaryForeground : 'none'} />
      <Text variant="label" style={{ color: theme.colors.primaryForeground, fontVariant: ['tabular-nums'] }}>
        {formatClock(seconds)}
      </Text>
    </View>
  );
}
