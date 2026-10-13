/**
 * S24 — New ticket (modal). Matches `docs/design/S24-new-ticket.png`.
 *
 * - Header: close (X), "New ticket", **Submit**.
 * - Subject (3–250), an optional course picker (the student's courses,
 *   prefilled from `?courseId=`), Priority (Low / Normal / High / Urgent,
 *   default Normal) and Description (≥ 5; it becomes the first message).
 * - `?lessonId=` is kept and shown on the course row while the prefilled
 *   course stays selected.
 * - On success it replaces itself with S23 for the new ticket. Closing with
 *   unsaved text asks to discard.
 *
 * Skipped from the design: "Attach media" and the attachment row (tickets
 * have no attachments in the API), the "system diagnostics" note (nothing is
 * sent), the character counter (the API sets no maximum) and the course code
 * line (not in the learning summary).
 */
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation, type Href } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { BookOpen, Check, ChevronDown, ChevronUp, X } from 'lucide-react-native';

import type { MyLearningRow } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { showToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { useTheme, type Theme } from '@/theme';

import { PRIORITY_LABEL } from '../components/TicketBadges';
import { useCreateTicket, useMyCourses, useTicketLesson } from '../hooks';
import { SUBJECT_MAX, TICKET_PRIORITIES, newTicketSchema, type NewTicketForm } from '../schemas';

const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }));

const param = (v: string | string[] | undefined) => (typeof v === 'string' && v ? v : null);

export function NewTicketScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ courseId?: string; lessonId?: string }>();
  const initialCourseId = param(params.courseId);
  const lessonId = param(params.lessonId);

  const coursesQ = useMyCourses();
  const lessonQ = useTicketLesson(lessonId);
  const create = useCreateTicket();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { control, handleSubmit, setValue } = useForm<NewTicketForm>({
    resolver: zodResolver(newTicketSchema),
    defaultValues: { subject: '', description: '', priority: 'normal', courseId: initialCourseId },
  });
  const [subject, description, courseId] = useWatch({
    control,
    name: ['subject', 'description', 'courseId'],
  });

  // The lesson belongs to the prefilled course; drop it if the course changes.
  const keepLesson = !!lessonId && !!courseId && courseId === initialCourseId;
  const hasText = subject.trim().length > 0 || description.trim().length > 0;

  // Once the ticket exists, stop guarding and open its thread (after the
  // guard has been turned off by this render).
  usePreventRemove(hasText && !createdId, ({ data }) => {
    Alert.alert('Discard this ticket?', 'What you’ve written will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  useEffect(() => {
    if (createdId) router.replace(`/(app)/support/${createdId}` as Href);
  }, [createdId]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/support' as Href);
  };

  const onSubmit = handleSubmit((values) => {
    create.mutate(
      {
        subject: values.subject,
        description: values.description,
        priority: values.priority,
        courseId: values.courseId ?? undefined,
        lessonId: keepLesson && lessonId ? lessonId : undefined,
      },
      {
        onSuccess: (ticket) => {
          showToast('Ticket created', 'success');
          setCreatedId(ticket.id);
        },
        onError: (e) => showToast(friendlyError((e as { code?: string }).code), 'error'),
      },
    );
  });

  const selected = coursesQ.data?.find((c) => c.id === courseId) ?? null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior="padding"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.three,
          paddingTop: Platform.OS === 'ios' ? theme.spacing.three : insets.top + theme.spacing.two,
          paddingHorizontal: theme.spacing.four,
          paddingBottom: theme.spacing.three,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <IconButton
          icon={<X size={22} color={theme.colors.foreground} />}
          label="Close"
          variant="muted"
          onPress={close}
        />
        <Text variant="heading" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
          New ticket
        </Text>
        <Button
          label="Submit"
          size="sm"
          fullWidth={false}
          loading={create.isPending}
          onPress={() => void onSubmit()}
          style={{ alignSelf: 'center' }}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: theme.spacing.four,
          paddingBottom: Math.max(insets.bottom, theme.spacing.four) + theme.spacing.four,
          gap: theme.spacing.five,
        }}
      >
        <Text tone="muted">Tell us what’s wrong and we’ll reply in this ticket.</Text>

        <Controller
          control={control}
          name="subject"
          render={({ field, fieldState }) => (
            <TextField
              label="Subject"
              placeholder="A short summary of the problem"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              maxLength={SUBJECT_MAX}
              returnKeyType="next"
            />
          )}
        />

        <View style={{ gap: theme.spacing.one }}>
          <Text variant="label" tone="muted">
            Course (optional)
          </Text>
          <CoursePicker
            theme={theme}
            open={pickerOpen}
            onToggle={() => setPickerOpen((o) => !o)}
            loading={coursesQ.isLoading}
            error={coursesQ.isError && !coursesQ.data}
            onRetry={() => void coursesQ.refetch()}
            courses={coursesQ.data ?? []}
            selectedId={courseId}
            selectedTitle={selected?.title ?? (courseId ? 'Linked course' : null)}
            lessonTitle={keepLesson ? (lessonQ.data?.title ?? null) : null}
            onSelect={(id) => {
              setValue('courseId', id, { shouldDirty: true });
              setPickerOpen(false);
            }}
          />
        </View>

        <View style={{ gap: theme.spacing.one }}>
          <Text variant="label" tone="muted">
            Priority
          </Text>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <SegmentedControl options={PRIORITY_OPTIONS} value={field.value} onChange={field.onChange} />
            )}
          />
        </View>

        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <View style={{ gap: theme.spacing.one }}>
              <Text variant="label" tone="muted">
                Description
              </Text>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="What happened, and what did you expect?"
                placeholderTextColor={theme.colors.mutedForeground}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Description"
                style={{
                  minHeight: 160,
                  padding: theme.spacing.four,
                  borderRadius: theme.radius.xl,
                  borderWidth: 1,
                  borderColor: fieldState.error ? theme.colors.destructive : theme.colors.border,
                  backgroundColor: theme.colors.muted,
                  color: theme.colors.foreground,
                  fontFamily: theme.fonts.regular,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              />
              {fieldState.error ? (
                <Text variant="caption" tone="destructive">
                  {fieldState.error.message}
                </Text>
              ) : (
                <Text variant="caption" tone="muted">
                  This becomes the first message of the ticket.
                </Text>
              )}
            </View>
          )}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CoursePicker({
  theme,
  open,
  onToggle,
  loading,
  error,
  onRetry,
  courses,
  selectedId,
  selectedTitle,
  lessonTitle,
  onSelect,
}: {
  theme: Theme;
  open: boolean;
  onToggle: () => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  courses: MyLearningRow[];
  selectedId: string | null;
  selectedTitle: string | null;
  lessonTitle: string | null;
  onSelect: (id: string | null) => void;
}) {
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View
      style={{
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Course: ${selectedTitle ?? 'none'}`}
        accessibilityState={{ expanded: open, disabled: loading }}
        accessibilityHint={error ? 'Retries loading your courses' : 'Choose a course'}
        disabled={loading}
        onPress={error ? onRetry : onToggle}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.three,
          minHeight: 64,
          padding: theme.spacing.three,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BookOpen size={18} color={theme.colors.foreground} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {loading ? (
            <>
              <Skeleton width="70%" height={16} />
              <Skeleton width="40%" height={12} />
            </>
          ) : error ? (
            <>
              <Text variant="bodyStrong">Couldn’t load your courses</Text>
              <Text variant="caption" tone="muted">
                Tap to try again
              </Text>
            </>
          ) : (
            <>
              <Text variant="bodyStrong" numberOfLines={1}>
                {selectedTitle ?? 'No course'}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {lessonTitle
                  ? `Lesson: ${lessonTitle}`
                  : selectedTitle
                    ? 'Tap to change'
                    : 'Pick one if it’s about a course'}
              </Text>
            </>
          )}
        </View>
        {loading || error ? null : <Chevron size={18} color={theme.colors.mutedForeground} />}
      </Pressable>

      {open && !loading && !error ? (
        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}>
          {[{ id: null, title: 'No course' }, ...courses].map((c) => {
            const active = c.id === selectedId;
            return (
              <Pressable
                key={c.id ?? 'none'}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onSelect(c.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.three,
                  minHeight: 48,
                  paddingHorizontal: theme.spacing.four,
                  backgroundColor: pressed ? theme.colors.muted : 'transparent',
                })}
              >
                <Text style={{ flex: 1 }} numberOfLines={1} tone={c.id ? 'default' : 'muted'}>
                  {c.title}
                </Text>
                {active ? <Check size={18} color={theme.colors.foreground} /> : null}
              </Pressable>
            );
          })}
          {courses.length === 0 ? (
            <Text variant="caption" tone="muted" style={{ padding: theme.spacing.four, paddingTop: 0 }}>
              You aren’t enrolled in any courses yet.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
