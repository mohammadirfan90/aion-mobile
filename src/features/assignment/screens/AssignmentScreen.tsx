/**
 * S16 — Assignment. Matches `docs/design/S16-assignment.png`.
 *
 *   - Title, due date, status pill; a collapsible Instructions card with the
 *     brief (markdown).
 *   - Status card: Not submitted / Submitted on {date} / Graded: {score}% with
 *     feedback.
 *   - Form: a text answer (≤ 20,000) and one optional attachment (document
 *     or photo) with upload progress, errors and a remove button.
 *   - **Submit**, then **Update submission**; read-only once graded (API §7).
 */
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
  Paperclip,
  RotateCcw,
  X,
} from 'lucide-react-native';

import type { Lesson, LessonAssignmentSubmission } from '@/api/types';
import { Markdown } from '@/components/Markdown';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { formatDate, formatDateTime, parseDate } from '@/lib/format';
import { fileTypeLabel } from '@/lib/lesson';
import { useTheme, type Theme } from '@/theme';

import type { PickedFile } from '../api';
import { useAssignmentLesson, useSubmission, useSubmitAssignment, useUploadAttachment } from '../hooks';
import { ANSWER_MAX, assignmentSchema, type AssignmentForm } from '../schemas';

interface Attachment {
  name: string;
  size: number | null;
  url: string | null;
  publicId: string | null;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  file?: PickedFile;
  uploadedAt?: string;
}

const SUBMIT_ERRORS: Record<string, string> = {
  ALREADY_GRADED: 'This assignment has already been graded.',
  EMPTY_SUBMISSION: 'Write an answer or attach a file.',
  SUBMISSION_TOO_LONG: 'Your answer is too long.',
  NOT_AN_ASSIGNMENT: 'This lesson isn’t an assignment.',
};

const UPLOAD_ERRORS: Record<string, string> = {
  FILE_TOO_LARGE: 'Files can be up to 10 MB.',
  UNSUPPORTED_MEDIA_TYPE: 'This file type isn’t supported.',
  INVALID_FILE: 'This file couldn’t be read.',
};

function formatBytes(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssignmentScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; courseId?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : null;

  const lessonQ = useAssignmentLesson(lessonId);
  const subQ = useSubmission(lessonId);
  const lesson = lessonQ.data ?? null;
  const courseId =
    (typeof params.courseId === 'string' && params.courseId) || lesson?.courseId || null;

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: insets.top + theme.spacing.two,
        paddingHorizontal: theme.spacing.four,
        paddingBottom: theme.spacing.two,
        gap: theme.spacing.two,
      }}
    >
      <IconButton
        icon={<ChevronLeft size={22} color={theme.colors.foreground} />}
        label="Back"
        variant="muted"
        onPress={() => router.back()}
      />
      <Text variant="heading" style={{ flex: 1, textAlign: 'center' }}>
        Assignment
      </Text>
      <IconButton
        icon={<MoreHorizontal size={20} color={theme.colors.foreground} />}
        label="More options"
        variant="muted"
        onPress={() =>
          Alert.alert('Assignment', undefined, [
            {
              text: 'Get help',
              onPress: () =>
                router.push(
                  `/(app)/support/new?courseId=${courseId ?? ''}&lessonId=${lessonId ?? ''}` as Href,
                ),
            },
            { text: 'Cancel', style: 'cancel' },
          ])
        }
      />
    </View>
  );

  if ((lessonQ.isError && !lesson) || (subQ.isError && subQ.data === undefined)) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {header}
        <ErrorState
          title="Couldn’t load the assignment"
          description="Check your connection and try again."
          onRetry={() => {
            void lessonQ.refetch();
            void subQ.refetch();
          }}
        />
      </View>
    );
  }

  if (!lesson || subQ.data === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {header}
        <View style={{ padding: theme.spacing.four, gap: theme.spacing.three }}>
          <Skeleton width="80%" height={28} />
          <Skeleton width="40%" />
          <Skeleton width="100%" height={140} radius={14} />
          <Skeleton width="100%" height={64} radius={14} />
          <Skeleton width="100%" height={160} radius={14} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {header}
      <SubmissionForm
        key={subQ.data?.updatedAt ?? 'new'}
        lesson={lesson}
        courseId={courseId}
        submission={subQ.data}
        bottomInset={insets.bottom}
        theme={theme}
      />
    </View>
  );
}

function SubmissionForm({
  lesson,
  courseId,
  submission,
  bottomInset,
  theme,
}: {
  lesson: Lesson;
  courseId: string | null;
  submission: LessonAssignmentSubmission | null;
  bottomInset: number;
  theme: Theme;
}) {
  const submit = useSubmitAssignment(lesson.id, courseId);
  const upload = useUploadAttachment();
  const [instructionsOpen, setInstructionsOpen] = useState(true);
  const [attachment, setAttachment] = useState<Attachment | null>(() =>
    submission?.attachmentUrl
      ? {
          name: submission.attachmentName ?? 'Attachment',
          size: null,
          url: submission.attachmentUrl,
          publicId: submission.attachmentPublicId,
          status: 'done',
          progress: 1,
          uploadedAt: submission.submittedAt,
        }
      : null,
  );

  const graded = submission?.status === 'graded';
  const settings = lesson.metadata?.assignmentSettings ?? {};
  const due = parseDate(settings.dueDate);

  const { control, handleSubmit, setValue, formState } = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      contentText: submission?.contentText ?? '',
      hasAttachment: !!submission?.attachmentUrl,
    },
  });

  const startUpload = (file: PickedFile) => {
    setAttachment({
      name: file.name,
      size: file.size,
      url: null,
      publicId: null,
      status: 'uploading',
      progress: 0,
      file,
    });
    setValue('hasAttachment', false);
    upload.mutate(
      {
        file,
        onProgress: (p) =>
          setAttachment((a) => (a && a.file === file ? { ...a, progress: p } : a)),
      },
      {
        onSuccess: (media) => {
          setAttachment((a) =>
            a && a.file === file
              ? {
                  ...a,
                  status: 'done',
                  progress: 1,
                  url: media.url,
                  publicId: media.publicId,
                  size: media.bytes ?? a.size,
                  uploadedAt: new Date().toISOString(),
                }
              : a,
          );
          setValue('hasAttachment', true, { shouldValidate: formState.isSubmitted });
        },
        onError: (e) => {
          const code = (e as { code?: string }).code ?? '';
          setAttachment((a) =>
            a && a.file === file
              ? { ...a, status: 'error', error: UPLOAD_ERRORS[code] ?? friendlyError(code) }
              : a,
          );
        },
      },
    );
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'text/plain',
        'text/markdown',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
      copyToCacheDirectory: true,
    });
    const asset = res.canceled ? null : res.assets[0];
    if (asset) {
      startUpload({
        uri: asset.uri,
        name: asset.name,
        size: asset.size ?? null,
        mimeType: asset.mimeType ?? 'application/octet-stream',
      });
    }
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // Re-encoding (quality < 1) turns HEIC photos into JPEG; the API rejects HEIC.
      quality: 0.8,
    });
    const asset = res.canceled ? null : res.assets[0];
    if (asset) {
      startUpload({
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
        size: asset.fileSize ?? null,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  const onAddFile = () =>
    Alert.alert('Add a file', undefined, [
      { text: 'Document', onPress: () => void pickDocument() },
      { text: 'Photo', onPress: () => void pickPhoto() },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const onRemove = () => {
    setAttachment(null);
    setValue('hasAttachment', false, { shouldValidate: formState.isSubmitted });
  };

  const onSubmit = handleSubmit((values) => {
    if (attachment?.status === 'uploading') return;
    const ready = attachment?.status === 'done' ? attachment : null;
    submit.mutate(
      {
        contentText: values.contentText.trim(),
        attachmentUrl: ready?.url ?? null,
        attachmentPublicId: ready?.publicId ?? undefined,
        attachmentName: ready?.name ?? undefined,
      },
      {
        onSuccess: () => showToast(submission ? 'Submission updated' : 'Assignment submitted', 'success'),
        onError: (e) => {
          const code = (e as { code?: string }).code ?? '';
          showToast(SUBMIT_ERRORS[code] ?? friendlyError(code), 'error');
        },
      },
    );
  });

  const statusLabel = graded ? 'Graded' : submission ? 'Submitted' : 'Not submitted';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.spacing.four, gap: theme.spacing.four }}
      >
        <Text variant="display">{lesson.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
          <CalendarDays size={16} color={theme.colors.mutedForeground} />
          <Text tone="muted" style={{ flex: 1 }}>
            {due ? `Due ${formatDateTime(due)}` : 'No due date'}
          </Text>
          <Badge label={statusLabel} tone={graded ? 'success' : 'neutral'} />
        </View>

        {lesson.content ? (
          <Card padded={false}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: instructionsOpen }}
              onPress={() => setInstructionsOpen((o) => !o)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.three,
                padding: theme.spacing.four,
                minHeight: 52,
              }}
            >
              <FileText size={18} color={theme.colors.foreground} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                Instructions
              </Text>
              {instructionsOpen ? (
                <ChevronUp size={18} color={theme.colors.mutedForeground} />
              ) : (
                <ChevronDown size={18} color={theme.colors.mutedForeground} />
              )}
            </Pressable>
            {instructionsOpen ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.four,
                  paddingBottom: theme.spacing.four,
                  paddingTop: theme.spacing.two,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Markdown value={lesson.content} />
              </View>
            ) : null}
          </Card>
        ) : null}

        <StatusCard submission={submission} theme={theme} />

        <View style={{ gap: theme.spacing.two }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyStrong">Your answer</Text>
            <Text variant="caption" tone="muted">
              Markdown supported
            </Text>
          </View>
          <Controller
            control={control}
            name="contentText"
            render={({ field, fieldState }) => (
              <>
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  editable={!graded}
                  multiline
                  maxLength={ANSWER_MAX}
                  placeholder={graded ? 'No written answer' : 'Write your answer…'}
                  placeholderTextColor={theme.colors.mutedForeground}
                  accessibilityLabel="Your answer"
                  textAlignVertical="top"
                  style={{
                    minHeight: 180,
                    maxHeight: 360,
                    padding: theme.spacing.four,
                    borderRadius: theme.radius.xl,
                    borderWidth: 1,
                    borderColor: fieldState.error ? theme.colors.destructive : theme.colors.border,
                    backgroundColor: theme.colors.muted,
                    color: theme.colors.foreground,
                    fontFamily: theme.fonts.regular,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                    opacity: graded ? 0.8 : 1,
                  }}
                />
                <View style={{ flexDirection: 'row' }}>
                  <Text variant="caption" tone="destructive" style={{ flex: 1 }}>
                    {fieldState.error?.message ?? ''}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {field.value.length.toLocaleString()} / {ANSWER_MAX.toLocaleString()}
                  </Text>
                </View>
              </>
            )}
          />
        </View>

        <View style={{ gap: theme.spacing.two }}>
          <Text variant="bodyStrong">Attachment</Text>
          {attachment ? (
            <AttachmentCard
              attachment={attachment}
              readOnly={graded}
              onRemove={onRemove}
              onRetry={() => attachment.file && startUpload(attachment.file)}
              theme={theme}
            />
          ) : null}
          {!attachment && !graded ? (
            <Pressable
              accessibilityRole="button"
              onPress={onAddFile}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.two,
                minHeight: 52,
                borderRadius: theme.radius.xl,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Paperclip size={18} color={theme.colors.mutedForeground} />
              <Text tone="muted">Add file</Text>
            </Pressable>
          ) : null}
          {!attachment && graded ? (
            <Text variant="caption" tone="muted">
              No file attached.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {graded ? null : (
        <View
          style={{
            paddingHorizontal: theme.spacing.four,
            paddingTop: theme.spacing.three,
            paddingBottom: Math.max(bottomInset, theme.spacing.three),
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          }}
        >
          <Button
            label={submission ? 'Update submission' : 'Submit'}
            loading={submit.isPending}
            disabled={attachment?.status === 'uploading' || !courseId}
            iconRight={<ArrowRight size={18} color={theme.colors.primaryForeground} />}
            onPress={onSubmit}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function StatusCard({
  submission,
  theme,
}: {
  submission: LessonAssignmentSubmission | null;
  theme: Theme;
}) {
  const graded = submission?.status === 'graded';
  const title = !submission
    ? 'Not submitted'
    : graded
      ? `Graded: ${submission.scorePercent ?? 0}%`
      : `Submitted on ${formatDateTime(submission.updatedAt)}`;
  const subtitle = !submission
    ? 'Write your answer below, attach a file if you need to, then submit.'
    : graded
      ? null
      : 'You can update your response until it’s graded.';
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: theme.spacing.three,
        padding: theme.spacing.four,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: graded ? theme.colors.success : theme.colors.border,
        backgroundColor: theme.colors.muted,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {submission ? (
          <Check size={16} color={graded ? theme.colors.success : theme.colors.foreground} />
        ) : (
          <FileText size={16} color={theme.colors.mutedForeground} />
        )}
      </View>
      <View style={{ flex: 1, gap: theme.spacing.one }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
        {graded && submission?.feedback ? (
          <View style={{ gap: 2, marginTop: theme.spacing.one }}>
            <Text variant="label" tone="muted">
              Feedback
            </Text>
            <Text>{submission.feedback}</Text>
          </View>
        ) : null}
        {graded && submission?.gradedAt ? (
          <Text variant="caption" tone="muted">
            Graded {formatDate(submission.gradedAt)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function AttachmentCard({
  attachment,
  readOnly,
  onRemove,
  onRetry,
  theme,
}: {
  attachment: Attachment;
  readOnly: boolean;
  onRemove: () => void;
  onRetry: () => void;
  theme: Theme;
}) {
  const isImage = /\.(jpe?g|png|webp|gif)$/i.test(attachment.name);
  const meta =
    attachment.status === 'uploading'
      ? `Uploading… ${Math.round(attachment.progress * 100)}%`
      : attachment.status === 'error'
        ? attachment.error ?? 'Upload failed'
        : [
            formatBytes(attachment.size),
            attachment.uploadedAt ? `Uploaded ${formatDate(attachment.uploadedAt)}` : fileTypeLabel(attachment.name),
          ]
            .filter(Boolean)
            .join(' · ');
  return (
    <Card style={{ gap: theme.spacing.three }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isImage ? (
            <ImageIcon size={20} color={theme.colors.foreground} />
          ) : (
            <FileText size={20} color={theme.colors.foreground} />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {attachment.name}
          </Text>
          <Text
            variant="caption"
            tone={attachment.status === 'error' ? 'destructive' : 'muted'}
            numberOfLines={2}
          >
            {meta}
          </Text>
        </View>
        {attachment.status === 'error' && attachment.file ? (
          <IconButton
            icon={<RotateCcw size={18} color={theme.colors.foreground} />}
            label="Retry upload"
            onPress={onRetry}
          />
        ) : null}
        {readOnly ? null : (
          <IconButton
            icon={<X size={20} color={theme.colors.foreground} />}
            label={`Remove ${attachment.name}`}
            onPress={onRemove}
          />
        )}
      </View>
      {attachment.status === 'uploading' ? <ProgressBar value={attachment.progress} height={4} /> : null}
    </Card>
  );
}
