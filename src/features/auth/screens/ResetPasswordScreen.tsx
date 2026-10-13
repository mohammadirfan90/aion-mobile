import { useRef, useState } from 'react';
import { Pressable, type TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleAlert } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { HeaderBackButton } from '@/components/ui/Header';
import { OtpInput } from '@/components/ui/OtpInput';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { showToast } from '@/components/ui/Toast';
import { useResetPassword } from '@/features/auth/hooks';
import {
  calculatePasswordStrength,
  type PasswordStrength,
  resetPasswordSchema,
} from '@/features/auth/schemas';
import { useTheme } from '@/theme';

export function ResetPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email as string) || 'ayesha@example.com';

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ code?: string; password?: string; confirmPassword?: string }>({});

  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const { resetPassword, resend, isLoading, isResending, error, clearError } = useResetPassword();
  const passwordStrength: PasswordStrength = calculatePasswordStrength(password);

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
    if (fieldErrors.confirmPassword && val === confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
    if (error) clearError();
  };

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val);
    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    if (error) clearError();
  };

  const handleReset = async () => {
    clearError();
    setFieldErrors({});

    const code = otp.join('');
    const validation = resetPasswordSchema.safeParse({
      code,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const formatted: { code?: string; password?: string; confirmPassword?: string } = {};
      for (const issue of validation.error.issues) {
        const path = issue.path[0] as 'code' | 'password' | 'confirmPassword';
        if (!formatted[path]) {
          formatted[path] = issue.message;
        }
      }
      setFieldErrors(formatted);
      return;
    }

    const success = await resetPassword(code, password);
    if (success) {
      showToast('Password reset successful', 'success');
      // A successful resetPassword leaves the user signed in;
      // Stack.Protected automatically mounts the (app) group / Home tab.
    }
  };

  const handleResend = async () => {
    if (isResending) return;
    clearError();
    const ok = await resend(email);
    if (ok) {
      showToast('A new 6-digit code has been sent', 'info');
    }
  };

  return (
    <Screen scroll keyboard padded edges={{ top: true, bottom: true }}>
      <View style={{ gap: theme.spacing.six, paddingBottom: theme.spacing.six }}>
        {/* Top back button */}
        <View style={{ alignItems: 'flex-start', marginTop: theme.spacing.one }}>
          <HeaderBackButton onPress={() => router.back()} />
        </View>

        {/* Heading block (matching S06-reset-password.png) */}
        <View style={{ gap: theme.spacing.one }}>
          <Text variant="display" weight="bold">
            Reset password
          </Text>
          <Text variant="body" tone="muted">
            Enter the code sent to <Text variant="bodyStrong">{email}</Text> and choose a new password.
          </Text>
        </View>

        {/* Global error banner (e.g. invalid code 000000) */}
        {error && (
          <View
            style={{
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.destructive,
              backgroundColor: theme.colors.muted,
              padding: theme.spacing.four,
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.two,
            }}
            accessibilityRole="alert"
          >
            <CircleAlert size={18} color={theme.colors.destructive} />
            <Text variant="bodyStrong" tone="destructive" style={{ flex: 1 }}>
              {error}
            </Text>
          </View>
        )}

        {/* Code Section */}
        <View style={{ gap: theme.spacing.two }}>
          <Text variant="label" tone="muted">
            Code
          </Text>
          <OtpInput
            length={6}
            value={otp}
            onChange={(next) => {
              setOtp(next);
              if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: undefined }));
              if (error) clearError();
            }}
            autoFocus
            disabled={isLoading}
          />
          {fieldErrors.code && (
            <Text variant="caption" tone="destructive" style={{ textAlign: 'center' }}>
              {fieldErrors.code}
            </Text>
          )}
        </View>

        {/* New Password & Strength */}
        <View style={{ gap: theme.spacing.one }}>
          <TextField
            ref={passwordRef}
            label="New password"
            placeholder="••••••••"
            value={password}
            onChangeText={handlePasswordChange}
            secureToggle
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            error={fieldErrors.password}
          />

          {password.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.two,
                marginTop: theme.spacing.one,
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  gap: theme.spacing.one,
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: theme.radius.full,
                    backgroundColor:
                      passwordStrength !== 'empty'
                        ? theme.colors.foreground
                        : theme.colors.muted,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: theme.radius.full,
                    backgroundColor:
                      passwordStrength === 'ok' || passwordStrength === 'strong'
                        ? theme.colors.foreground
                        : theme.colors.muted,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: theme.radius.full,
                    backgroundColor:
                      passwordStrength === 'strong'
                        ? theme.colors.foreground
                        : theme.colors.muted,
                  }}
                />
              </View>

              <Text
                variant="caption"
                tone="muted"
                style={{
                  textTransform: 'capitalize',
                  minWidth: 44,
                  textAlign: 'right',
                }}
              >
                {passwordStrength === 'ok' ? 'Good' : passwordStrength}
              </Text>
            </View>
          )}
        </View>

        {/* Confirm Password */}
        <TextField
          ref={confirmPasswordRef}
          label="Confirm password"
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={handleConfirmPasswordChange}
          secureToggle
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleReset}
          error={fieldErrors.confirmPassword}
        />

        {/* Action Button */}
        <View style={{ marginTop: theme.spacing.two }}>
          <Button
            label="Reset password"
            size="lg"
            fullWidth
            loading={isLoading}
            onPress={handleReset}
          />
        </View>

        {/* Resend footer (matching S06-reset-password.png) */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: theme.spacing.one,
            marginTop: theme.spacing.six,
          }}
        >
          <Text variant="body" tone="muted">
            Didn&apos;t receive the code?
          </Text>
          <Pressable
            onPress={handleResend}
            disabled={isResending}
            accessibilityRole="button"
            accessibilityLabel="Resend code"
            hitSlop={8}
          >
            <Text variant="bodyStrong">
              {isResending ? 'Sending...' : 'Resend'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
