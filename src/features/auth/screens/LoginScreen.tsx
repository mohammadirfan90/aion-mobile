import { useRef, useState } from 'react';
import {
  Pressable,
  type TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CircleAlert, ShieldCheck } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useLogin } from '@/features/auth/hooks';
import { loginSchema } from '@/features/auth/schemas';
import { useTheme } from '@/theme';

export function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { login, isLoading, bannerError, clearBanner } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const passwordInputRef = useRef<TextInput>(null);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (bannerError) clearBanner();
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (bannerError) clearBanner();
  };

  const handleSubmit = async () => {
    clearBanner();
    setFieldErrors({});

    // Validate with zod
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted: { email?: string; password?: string } = {};
      for (const err of validation.error.issues) {
        if (err.path[0] === 'email' && !formatted.email) {
          formatted.email = err.message;
        }
        if (err.path[0] === 'password' && !formatted.password) {
          formatted.password = err.message;
        }
      }
      setFieldErrors(formatted);
      return;
    }

    await login(email.trim(), password);
    // On success, Stack.Protected in RootLayout automatically flips to (app)
  };

  const navigateToSignup = () => {
    router.push('/(auth)/signup');
  };

  const navigateToForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const navigateToVerifyEmail = (emailAddress?: string) => {
    const target = emailAddress ? `/(auth)/verify-email?email=${encodeURIComponent(emailAddress)}` : '/(auth)/verify-email';
    router.push(target as never);
  };

  const navigateToPublicVerify = () => {
    router.push('/verify');
  };

  return (
    <Screen scroll keyboard padded edges={{ top: true, bottom: true }}>
      <View style={{ flex: 1, justifyContent: 'space-between', minHeight: 560 }}>
        {/* Main Content Area */}
        <View style={{ gap: theme.spacing.six }}>
          {/* Top Logo & App Title (matching S02-login.png) */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.three,
              marginTop: theme.spacing.four,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.foreground,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                variant="heading"
                weight="bold"
                style={{ color: theme.colors.background }}
              >
                A
              </Text>
            </View>
            <Text variant="title" weight="bold">
              Aion
            </Text>
          </View>

          {/* Heading block */}
          <View style={{ gap: theme.spacing.one }}>
            <Text variant="display" weight="bold">
              Welcome back
            </Text>
            <Text variant="body" tone="muted">
              Log in to continue learning
            </Text>
          </View>

          {/* Error Banner (credentials / rate_limited / unverified / network) */}
          {bannerError && (
            <View
              style={{
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: theme.colors.destructive,
                backgroundColor: theme.colors.muted,
                padding: theme.spacing.four,
                gap: theme.spacing.two,
              }}
              accessibilityRole="alert"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
                <CircleAlert size={18} color={theme.colors.destructive} />
                <Text
                  variant="bodyStrong"
                  tone="destructive"
                  style={{ flex: 1 }}
                >
                  {bannerError.message}
                </Text>
              </View>

              {bannerError.type === 'unverified' && (
                <Pressable
                  onPress={() => navigateToVerifyEmail(bannerError.email)}
                  accessibilityRole="button"
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: theme.spacing.one,
                    paddingVertical: theme.spacing.one,
                  }}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={{
                      color: theme.colors.foreground,
                      textDecorationLine: 'underline',
                    }}
                  >
                    Enter code &rarr;
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Form Fields */}
          <View style={{ gap: theme.spacing.four }}>
            {/* Email Field */}
            <TextField
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              error={fieldErrors.email}
            />

            {/* Password Field with Header Link */}
            <View style={{ gap: theme.spacing.one }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text variant="label" tone="muted">
                  Password
                </Text>
                <Pressable
                  onPress={navigateToForgotPassword}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password?"
                  hitSlop={8}
                >
                  <Text variant="caption" tone="muted">
                    Forgot password?
                  </Text>
                </Pressable>
              </View>

              <TextField
                ref={passwordInputRef}
                placeholder="••••••••"
                value={password}
                onChangeText={handlePasswordChange}
                secureToggle
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                error={fieldErrors.password}
              />
            </View>

            {/* Log in Primary Button */}
            <View style={{ marginTop: theme.spacing.two }}>
              <Button
                label="Log in"
                size="lg"
                fullWidth
                loading={isLoading}
                onPress={handleSubmit}
              />
            </View>

            {/* Don't have an account footer */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: theme.spacing.one,
                marginTop: theme.spacing.two,
              }}
            >
              <Text variant="body" tone="muted">
                {"Don't have an account?"}
              </Text>
              <Pressable
                onPress={navigateToSignup}
                accessibilityRole="button"
                accessibilityLabel="Sign up"
                hitSlop={8}
              >
                <Text variant="bodyStrong">
                  Sign up
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Bottom Verify Certificate Link (matching S02-login.png) */}
        <View
          style={{
            alignItems: 'center',
            paddingVertical: theme.spacing.four,
            marginTop: theme.spacing.six,
          }}
        >
          <Pressable
            onPress={navigateToPublicVerify}
            accessibilityRole="button"
            accessibilityLabel="Verify a certificate"
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.two,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ShieldCheck size={16} color={theme.colors.mutedForeground} />
            <Text
              variant="caption"
              tone="muted"
              style={{ textDecorationLine: 'underline' }}
            >
              Verify a certificate
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
