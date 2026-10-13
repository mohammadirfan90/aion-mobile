/**
 * S26 — Edit profile. Matches docs/design/S26-edit-profile.png.
 *
 *   - Header: Cancel · "Edit profile" · Save (disabled until something changes).
 *   - Avatar: tap → Take photo / Choose from library (/ Remove photo); a local
 *     preview while it uploads through `lib/upload.ts` (`folder=avatars`).
 *   - Name, Username (`USERNAME_TAKEN` shown on the field), Headline, Bio
 *     (counter), Learning goals, and the AI features (`aiConsent`) switch.
 *   - Leaving with unsaved changes asks to discard.
 *
 * Data: `useMe()` + `useUpdateMe()` (`PATCH /users/me`, API §12).
 */
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type Control, type FieldPath } from 'react-hook-form';
import { Bot, Camera, ChevronLeft } from 'lucide-react-native';

import type { Me, UpdateMeBody } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { showToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { useTheme, type Theme } from '@/theme';

import type { PickedFile } from '../api';
import { ThemedSwitch } from '../components/MenuGroup';
import { StackHeader } from '../components/StackHeader';
import { useMe, useUpdateMe, useUploadAvatar } from '../hooks';
import {
  BIO_MAX,
  GOALS_MAX,
  HEADLINE_MAX,
  NAME_MAX,
  editProfileSchema,
  type EditProfileInput,
  type EditProfileValues,
} from '../schemas';

const AVATAR_SIZE = 104;

const UPLOAD_ERRORS: Record<string, string> = {
  FILE_TOO_LARGE: 'Photos can be up to 5 MB.',
  UNSUPPORTED_MEDIA_TYPE: 'This image type isn’t supported. Try a JPEG or PNG.',
  INVALID_FILE: 'This image couldn’t be read.',
};

interface AvatarState {
  /** What the avatar shows: the local file while uploading, else the uploaded URL. */
  preview: string | null;
  /** The URL that Save sends as `avatarUrl`. */
  url: string | null;
  uploading: boolean;
  progress: number;
}

export function EditProfileScreen() {
  const theme = useTheme();
  const meQ = useMe();

  if (meQ.isError && !meQ.data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StackHeader title="Edit profile" left={<BackButton theme={theme} />} />
        <ErrorState
          title="Couldn’t load your profile"
          description="Check your connection and try again."
          onRetry={() => void meQ.refetch()}
        />
      </View>
    );
  }

  if (!meQ.data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StackHeader title="Edit profile" left={<BackButton theme={theme} />} bordered />
        <View style={{ padding: theme.spacing.four, gap: theme.spacing.four, alignItems: 'center' }}>
          <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} radius={AVATAR_SIZE / 2} />
          <Skeleton width={100} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={52} radius={theme.radius.full} />
          ))}
          <Skeleton height={120} radius={theme.radius.xl} />
          <Skeleton height={120} radius={theme.radius.xl} />
        </View>
      </View>
    );
  }

  return <EditProfileForm key={meQ.data.id} me={meQ.data} theme={theme} />;
}

function BackButton({ theme }: { theme: Theme }) {
  return (
    <IconButton
      icon={<ChevronLeft size={22} color={theme.colors.foreground} />}
      label="Back"
      variant="muted"
      onPress={() => router.back()}
    />
  );
}

function toFormValues(me: Me): EditProfileInput {
  return {
    name: me.name ?? '',
    username: me.username ?? '',
    headline: me.headline ?? '',
    bio: me.bio ?? '',
    learningGoals: me.learningGoals ?? '',
    aiConsent: me.aiConsent,
  };
}

/** Only the fields that changed; empty optional text is sent as `null`. */
function buildBody(me: Me, v: EditProfileValues, avatarUrl: string | null): UpdateMeBody {
  const body: UpdateMeBody = {};
  const orNull = (s: string) => (s.length ? s : null);
  if (v.name !== (me.name ?? '')) body.name = v.name;
  if (v.username !== (me.username ?? '')) body.username = v.username;
  if (orNull(v.headline) !== me.headline) body.headline = orNull(v.headline);
  if (orNull(v.bio) !== me.bio) body.bio = orNull(v.bio);
  if (orNull(v.learningGoals) !== me.learningGoals) body.learningGoals = orNull(v.learningGoals);
  if (v.aiConsent !== me.aiConsent) body.aiConsent = v.aiConsent;
  if (avatarUrl !== me.avatarUrl) body.avatarUrl = avatarUrl;
  return body;
}

function EditProfileForm({ me, theme }: { me: Me; theme: Theme }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const update = useUpdateMe();
  const upload = useUploadAvatar();
  const leaving = useRef(false);
  const [avatar, setAvatar] = useState<AvatarState>({
    preview: me.avatarUrl,
    url: me.avatarUrl,
    uploading: false,
    progress: 0,
  });

  const { control, handleSubmit, setError, formState } = useForm<EditProfileInput, unknown, EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: toFormValues(me),
  });

  const avatarChanged = avatar.url !== me.avatarUrl;
  const dirty = formState.isDirty || avatarChanged || avatar.uploading;

  usePreventRemove(dirty && !update.isPending, ({ data }) => {
    if (leaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert('Discard changes?', 'Your edits to your profile haven’t been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const startUpload = (file: PickedFile) => {
    const previous = { preview: avatar.preview, url: avatar.url };
    setAvatar({ preview: file.uri, url: previous.url, uploading: true, progress: 0 });
    upload.mutate(
      {
        file,
        onProgress: (p) => setAvatar((a) => (a.preview === file.uri ? { ...a, progress: p } : a)),
      },
      {
        onSuccess: (media) =>
          setAvatar((a) =>
            a.preview === file.uri ? { preview: file.uri, url: media.url, uploading: false, progress: 1 } : a,
          ),
        onError: (e) => {
          const code = (e as { code?: string }).code ?? '';
          setAvatar({ ...previous, uploading: false, progress: 0 });
          showToast(UPLOAD_ERRORS[code] ?? friendlyError(code), 'error');
        },
      },
    );
  };

  const fromAsset = (asset: ImagePicker.ImagePickerAsset): PickedFile => ({
    uri: asset.uri,
    name: asset.fileName ?? `avatar-${Date.now()}.jpg`,
    size: asset.fileSize ?? null,
    mimeType: asset.mimeType ?? 'image/jpeg',
  });

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    // Re-encoding (quality < 1) turns HEIC photos into JPEG; the API rejects HEIC.
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1],
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in your device settings to take a profile photo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync(pickerOptions);
    const asset = res.canceled ? null : res.assets[0];
    if (asset) startUpload(fromAsset(asset));
  };

  const chooseFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    const asset = res.canceled ? null : res.assets[0];
    if (asset) startUpload(fromAsset(asset));
  };

  const onChangePhoto = () => {
    if (avatar.uploading) return;
    Alert.alert('Profile photo', undefined, [
      { text: 'Take photo', onPress: () => void takePhoto() },
      { text: 'Choose from library', onPress: () => void chooseFromLibrary() },
      ...(avatar.url
        ? [
            {
              text: 'Remove photo',
              style: 'destructive' as const,
              onPress: () => setAvatar({ preview: null, url: null, uploading: false, progress: 0 }),
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const save = (values: EditProfileValues) => {
    if (avatar.uploading) return;
    const body = buildBody(me, values, avatar.url);
    const done = () => {
      leaving.current = true;
      router.back();
    };
    if (Object.keys(body).length === 0) {
      done();
      return;
    }
    update.mutate(body, {
      onSuccess: () => {
        showToast('Profile updated', 'success');
        done();
      },
      onError: (e) => {
        const code = (e as { code?: string }).code ?? '';
        if (code === 'USERNAME_TAKEN') {
          setError('username', { type: 'server', message: friendlyError(code) }, { shouldFocus: true });
        } else {
          showToast(friendlyError(code), 'error');
        }
      },
    });
  };
  // handleSubmit is called in the press handler, not during render (react-hooks/refs).
  const onSave = () => void handleSubmit(save)();

  const displayName = me.name?.trim() || me.username || me.email;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StackHeader
        title="Edit profile"
        bordered
        left={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text tone="muted">Cancel</Text>
          </Pressable>
        }
        right={
          <Button
            label="Save"
            size="sm"
            fullWidth={false}
            disabled={!dirty || avatar.uploading}
            loading={update.isPending}
            onPress={onSave}
            accessibilityLabel="Save profile"
          />
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: theme.spacing.four,
            paddingBottom: insets.bottom + theme.spacing.eight,
            gap: theme.spacing.four,
          }}
        >
          {/* Avatar */}
          <Pressable
            onPress={onChangePhoto}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            accessibilityState={{ busy: avatar.uploading }}
            style={{ alignSelf: 'center', alignItems: 'center', gap: theme.spacing.three }}
          >
            <View>
              <Avatar uri={avatar.preview} name={displayName} size={AVATAR_SIZE} />
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: theme.colors.primary,
                  borderWidth: 2,
                  borderColor: theme.colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={16} color={theme.colors.primaryForeground} />
              </View>
            </View>
            <Text variant="label">{avatar.uploading ? `Uploading… ${Math.round(avatar.progress * 100)}%` : 'Change photo'}</Text>
          </Pressable>
          {avatar.uploading ? (
            <View style={{ alignSelf: 'center', width: 160 }}>
              <ProgressBar value={avatar.progress} height={4} />
            </View>
          ) : null}

          <FormField control={control} name="name" label="Name" maxLength={NAME_MAX} autoComplete="name" textContentType="name" />
          <FormField
            control={control}
            name="username"
            label="Username"
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            hint="3–20 lowercase letters, numbers or underscores."
          />
          <FormField
            control={control}
            name="headline"
            label="Headline"
            maxLength={HEADLINE_MAX}
            placeholder="e.g. Frontend learner · Dhaka"
          />
          <TextAreaField
            control={control}
            name="bio"
            label="Bio"
            max={BIO_MAX}
            counter
            placeholder="Tell others about yourself, what you’re building, and what you love learning…"
            theme={theme}
          />
          <TextAreaField
            control={control}
            name="learningGoals"
            label="Learning goals"
            max={GOALS_MAX}
            placeholder="e.g. Build a full-stack app with React and TypeScript…"
            theme={theme}
          />

          <Controller
            control={control}
            name="aiConsent"
            render={({ field }) => (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
                <View style={{ flex: 1, gap: theme.spacing.one }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
                    <Bot size={18} color={theme.colors.foreground} />
                    <Text variant="bodyStrong">AI features</Text>
                  </View>
                  <Text variant="caption" tone="muted">
                    Let Aion use your progress to personalise the AI tutor, summaries and flashcards.
                  </Text>
                </View>
                <ThemedSwitch
                  value={field.value}
                  onValueChange={field.onChange}
                  accessibilityLabel="AI features"
                />
              </Card>
            )}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type TextFieldName = Exclude<FieldPath<EditProfileInput>, 'aiConsent'>;

function FormField({
  control,
  name,
  label,
  hint,
  ...input
}: {
  control: Control<EditProfileInput, unknown, EditProfileValues>;
  name: TextFieldName;
  label: string;
  hint?: string;
} & Pick<
  React.ComponentProps<typeof TextField>,
  'maxLength' | 'autoCapitalize' | 'autoCorrect' | 'autoComplete' | 'textContentType' | 'placeholder'
>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...input}
          ref={field.ref}
          label={label}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          hint={hint}
          accessibilityLabel={label}
        />
      )}
    />
  );
}

function TextAreaField({
  control,
  name,
  label,
  max,
  counter,
  placeholder,
  theme,
}: {
  control: Control<EditProfileInput, unknown, EditProfileValues>;
  name: TextFieldName;
  label: string;
  max: number;
  counter?: boolean;
  placeholder: string;
  theme: Theme;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={{ gap: theme.spacing.one }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="label" tone="muted">
              {label}
            </Text>
            <Text variant="caption" tone="muted">
              {counter ? `${field.value.length} / ${max}` : 'Optional'}
            </Text>
          </View>
          <TextInput
            ref={field.ref}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            maxLength={max}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.mutedForeground}
            accessibilityLabel={label}
            textAlignVertical="top"
            style={{
              minHeight: 112,
              maxHeight: 240,
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
          ) : null}
        </View>
      )}
    />
  );
}
