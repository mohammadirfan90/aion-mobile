/**
 * S21 — New post (modal). Matches `docs/design/S21-new-post.png`.
 *
 *   - Header: Cancel, "New post", and a **Post** pill.
 *   - A "linked to" chip when opened with `courseId` / `lessonId` (removable).
 *   - Title (3–250, with a counter), Category picker (default General),
 *     Content (≥ 5, markdown), and one optional image, uploaded through
 *     `lib/upload.ts` (`folder=forum`) as soon as it's picked, with progress.
 *   - Closing with unsaved text asks to discard. On success it replaces itself
 *     with S20 for the new post.
 *
 * Not built from the design: the markdown formatting toolbar above the
 * keyboard (kept simple; markdown can be typed directly).
 */
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation, type Href } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { BookOpen, ChevronRight, ImagePlus, Image as ImageIcon, Lightbulb, RotateCcw, X } from 'lucide-react-native';

import type { CreateForumPostBody } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { MAX_IMAGE_BYTES } from '@/lib/upload';
import { useTheme } from '@/theme';

import type { PickedFile } from '../api';
import { OptionSheet } from '../components/OptionSheet';
import { CATEGORY_LABELS } from '../format';
import { useCreatePost, useLinkedContext, useUploadForumImage } from '../hooks';
import { FORUM_CATEGORIES, newPostSchema, TITLE_MAX, type NewPostForm } from '../schemas';

interface PickedImage {
  file: PickedFile;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  url: string | null;
  publicId: string | null;
  error?: string;
}

const UPLOAD_ERRORS: Record<string, string> = {
  FILE_TOO_LARGE: 'Images can be up to 5 MB.',
  UNSUPPORTED_MEDIA_TYPE: 'This image type isn’t supported.',
  INVALID_FILE: 'This image couldn’t be read.',
};

const CATEGORY_OPTIONS = FORUM_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }));

const errorCode = (e: unknown) => (e as { code?: string } | null)?.code ?? '';

function formatBytes(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NewPostScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ courseId?: string; lessonId?: string; chapterId?: string }>();
  const courseId = typeof params.courseId === 'string' && params.courseId ? params.courseId : null;
  const lessonId = typeof params.lessonId === 'string' && params.lessonId ? params.lessonId : null;
  const chapterId = typeof params.chapterId === 'string' && params.chapterId ? params.chapterId : null;

  const linkedTitles = useLinkedContext(courseId, lessonId);
  const create = useCreatePost();
  const upload = useUploadForumImage();

  const [linked, setLinked] = useState(!!(courseId || lessonId));
  const [image, setImage] = useState<PickedImage | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const { control, handleSubmit, setValue } = useForm<NewPostForm>({
    resolver: zodResolver(newPostSchema),
    defaultValues: { title: '', category: 'general', content: '' },
  });
  const [title, content, category] = useWatch({ control, name: ['title', 'content', 'category'] });

  const dirty = title.trim() !== '' || content.trim() !== '' || image !== null;

  usePreventRemove(dirty && !createdId, ({ data }) => {
    Alert.alert('Discard this post?', 'What you’ve written will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  // Navigate only after the render that turned the discard guard off.
  useEffect(() => {
    if (createdId) router.replace(`/(app)/forum/${createdId}` as Href);
  }, [createdId]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)/community' as Href);
  };

  const startUpload = (file: PickedFile) => {
    setImage({ file, status: 'uploading', progress: 0, url: null, publicId: null });
    upload.mutate(
      {
        file,
        onProgress: (p) => setImage((img) => (img && img.file === file ? { ...img, progress: p } : img)),
      },
      {
        onSuccess: (media) =>
          setImage((img) =>
            img && img.file === file
              ? { ...img, status: 'done', progress: 1, url: media.url, publicId: media.publicId }
              : img,
          ),
        onError: (e) =>
          setImage((img) =>
            img && img.file === file
              ? { ...img, status: 'error', error: UPLOAD_ERRORS[errorCode(e)] ?? friendlyError(errorCode(e)) }
              : img,
          ),
      },
    );
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // Re-encoding (quality < 1) turns HEIC photos into JPEG; the API rejects HEIC.
      quality: 0.8,
    });
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;
    startUpload({
      uri: asset.uri,
      name: asset.fileName ?? `image-${Date.now()}.jpg`,
      size: asset.fileSize ?? null,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const onSubmit = handleSubmit((values) => {
    if (image?.status === 'uploading') return;
    if (image?.status === 'error') {
      showToast('Remove the image or try uploading it again.', 'error');
      return;
    }
    const body: CreateForumPostBody = {
      title: values.title.trim(),
      content: values.content.trim(),
      category: values.category,
      ...(image?.status === 'done' && image.url
        ? { imageUrl: image.url, imagePublicId: image.publicId ?? undefined }
        : null),
      ...(linked && courseId ? { courseId } : null),
      ...(linked && lessonId ? { lessonId } : null),
      ...(linked && chapterId ? { chapterId } : null),
    };
    create.mutate(body, {
      onSuccess: (row) => {
        showToast('Post published', 'success');
        setCreatedId(row.id);
      },
      onError: (e) => showToast(friendlyError(errorCode(e)), 'error'),
    });
  });

  const linkLabel =
    [linkedTitles.courseTitle, linkedTitles.lessonTitle].filter(Boolean).join(' · ') ||
    (lessonId ? 'This lesson' : 'This course');

  const busy = create.isPending || !!createdId;
  const uploading = image?.status === 'uploading';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior="padding">
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          // iOS shows this as a page sheet below the status bar.
          paddingTop: (Platform.OS === 'ios' ? 0 : insets.top) + theme.spacing.three,
          paddingHorizontal: theme.spacing.four,
          paddingBottom: theme.spacing.three,
          gap: theme.spacing.two,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={8}
          style={{ minWidth: 72, minHeight: 44, justifyContent: 'center' }}
        >
          <Text tone="muted">Cancel</Text>
        </Pressable>
        <Text variant="heading" style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">
          New post
        </Text>
        <View style={{ minWidth: 72, alignItems: 'flex-end' }}>
          <Button
            label="Post"
            size="sm"
            fullWidth={false}
            loading={busy}
            disabled={uploading}
            onPress={onSubmit}
          />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: theme.spacing.four,
          gap: theme.spacing.four,
          paddingBottom: Math.max(insets.bottom, theme.spacing.four) + theme.spacing.four,
        }}
      >
        {linked && (courseId || lessonId) ? (
          <View
            style={{
              alignSelf: 'flex-start',
              maxWidth: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.two,
              paddingLeft: theme.spacing.three,
              borderRadius: theme.radius.full,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.muted,
            }}
          >
            <BookOpen size={16} color={theme.colors.mutedForeground} />
            <Text variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
              {linkLabel}
            </Text>
            <IconButton
              icon={<X size={16} color={theme.colors.mutedForeground} />}
              label="Don’t link this post to the lesson"
              size={36}
              onPress={() => setLinked(false)}
            />
          </View>
        ) : null}

        <Controller
          control={control}
          name="title"
          render={({ field, fieldState }) => (
            <View style={{ gap: theme.spacing.one }}>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="Title"
                placeholderTextColor={theme.colors.mutedForeground}
                accessibilityLabel="Title"
                maxLength={TITLE_MAX}
                multiline
                submitBehavior="blurAndSubmit"
                returnKeyType="next"
                style={{
                  color: theme.colors.foreground,
                  fontFamily: theme.fonts.semibold,
                  fontSize: theme.typography.title.fontSize,
                  lineHeight: theme.typography.title.lineHeight,
                  paddingVertical: theme.spacing.one,
                }}
              />
              <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>
                <Text variant="caption" tone="destructive" style={{ flex: 1 }}>
                  {fieldState.error?.message ?? ''}
                </Text>
                <Text variant="caption" tone="muted">
                  {title.length} / {TITLE_MAX}
                </Text>
              </View>
            </View>
          )}
        />

        <Pressable
          onPress={() => setCategoryOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Category: ${CATEGORY_LABELS[category]}`}
          accessibilityHint="Opens the category list"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.two,
            minHeight: 56,
            paddingHorizontal: theme.spacing.four,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text tone="muted" style={{ flex: 1 }}>
            Category
          </Text>
          <View
            style={{
              paddingHorizontal: theme.spacing.three,
              paddingVertical: theme.spacing.one + 2,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            }}
          >
            <Text variant="bodyStrong">{CATEGORY_LABELS[category]}</Text>
          </View>
          <ChevronRight size={18} color={theme.colors.mutedForeground} />
        </Pressable>

        <Controller
          control={control}
          name="content"
          render={({ field, fieldState }) => (
            <View style={{ gap: theme.spacing.one }}>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="What would you like to ask or share? Markdown works too."
                placeholderTextColor={theme.colors.mutedForeground}
                accessibilityLabel="Content"
                multiline
                textAlignVertical="top"
                style={{
                  minHeight: 160,
                  color: theme.colors.foreground,
                  fontFamily: theme.fonts.regular,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                  paddingVertical: theme.spacing.one,
                }}
              />
              {fieldState.error ? (
                <Text variant="caption" tone="destructive">
                  {fieldState.error.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        {image ? (
          <View style={{ gap: theme.spacing.two }}>
            <View
              style={{
                width: '100%',
                aspectRatio: 16 / 10,
                borderRadius: theme.radius.xl,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.muted,
              }}
            >
              <Image
                source={{ uri: image.file.uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                accessibilityLabel="Selected image"
              />
              <View
                style={{
                  position: 'absolute',
                  top: theme.spacing.two,
                  right: theme.spacing.two,
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colors.primary,
                }}
              >
                <IconButton
                  icon={<X size={18} color={theme.colors.primaryForeground} />}
                  label="Remove image"
                  size={36}
                  onPress={() => setImage(null)}
                />
              </View>
            </View>
            {image.status === 'uploading' ? <ProgressBar value={image.progress} height={4} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
              <ImageIcon size={16} color={theme.colors.mutedForeground} />
              <Text
                variant="caption"
                tone={image.status === 'error' ? 'destructive' : 'muted'}
                numberOfLines={2}
                style={{ flex: 1 }}
              >
                {image.status === 'uploading'
                  ? `Uploading… ${Math.round(image.progress * 100)}%`
                  : image.status === 'error'
                    ? image.error ?? 'Upload failed'
                    : [image.file.name, formatBytes(image.file.size)].filter(Boolean).join(' · ')}
              </Text>
              {image.status === 'error' ? (
                <IconButton
                  icon={<RotateCcw size={16} color={theme.colors.foreground} />}
                  label="Retry upload"
                  size={36}
                  onPress={() => startUpload(image.file)}
                />
              ) : null}
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.three }}>
            <Pressable
              onPress={() => void pickImage()}
              accessibilityRole="button"
              accessibilityLabel="Add image or screenshot"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.two,
                minHeight: 48,
                paddingHorizontal: theme.spacing.four,
                borderRadius: theme.radius.lg,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ImagePlus size={18} color={theme.colors.foreground} />
              <Text>Add image or screenshot</Text>
            </Pressable>
            <Text variant="caption" tone="muted">
              PNG, JPG up to {Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB
            </Text>
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.three,
            padding: theme.spacing.four,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}
        >
          <Lightbulb size={18} color={theme.colors.mutedForeground} />
          <Text tone="muted" style={{ flex: 1 }}>
            Including the exact error message or a short code snippet helps others reply faster.
          </Text>
        </View>
      </ScrollView>

      <OptionSheet
        visible={categoryOpen}
        title="Category"
        options={CATEGORY_OPTIONS}
        selected={category}
        onSelect={(value) => {
          setValue('category', value, { shouldDirty: true });
          setCategoryOpen(false);
        }}
        onClose={() => setCategoryOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
