/**
 * S27 → Change password: a modal dialog with a new password and a confirm
 * field (min 8, must match) → `POST /auth/password` (API §2). Shows the API
 * error inline and a success toast on the way out.
 */
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { showToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { useTheme } from '@/theme';

import { useChangePassword } from '../hooks';
import { changePasswordSchema, type ChangePasswordInput } from '../schemas';

const PASSWORD_ERRORS: Record<string, string> = {
  UPDATE_FAILED: 'We couldn’t change your password. Please try again.',
  VALIDATION_ERROR: 'Password must be at least 8 characters.',
};

export function ChangePasswordDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const change = useChangePassword();
  const { control, handleSubmit, reset } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const close = () => {
    if (change.isPending) return;
    reset();
    change.reset();
    onClose();
  };

  const onSubmit = handleSubmit((values) => {
    change.mutate(values.password, {
      onSuccess: () => {
        showToast('Password updated', 'success');
        reset();
        change.reset();
        onClose();
      },
    });
  });

  const errorCode = (change.error as { code?: string } | null)?.code;
  const errorText = change.isError ? (errorCode && PASSWORD_ERRORS[errorCode]) || friendlyError(errorCode) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: theme.spacing.four,
            backgroundColor: theme.colors.scrim,
          }}
        >
          <Pressable
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <Card style={{ gap: theme.spacing.four, borderRadius: theme.radius.xl }} accessibilityViewIsModal>
            <View style={{ gap: theme.spacing.one }}>
              <Text variant="heading" accessibilityRole="header">
                Change password
              </Text>
              <Text variant="caption" tone="muted">
                Use at least 8 characters. You’ll stay signed in on this device.
              </Text>
            </View>

            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <TextField
                  ref={field.ref}
                  label="New password"
                  value={field.value}
                  onChangeText={(v) => {
                    field.onChange(v);
                    if (change.isError) change.reset();
                  }}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  secureToggle
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  accessibilityLabel="New password"
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <TextField
                  ref={field.ref}
                  label="Confirm password"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  secureToggle
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                  accessibilityLabel="Confirm password"
                />
              )}
            />

            {errorText ? (
              <Text variant="caption" tone="destructive" accessibilityRole="alert">
                {errorText}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: theme.spacing.three }}>
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={close} disabled={change.isPending} />
              <Button label="Update" style={{ flex: 1 }} loading={change.isPending} onPress={onSubmit} />
            </View>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
