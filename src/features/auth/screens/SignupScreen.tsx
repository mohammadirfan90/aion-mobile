import { useRef, useState } from 'react';
import {
  Pressable,
  type TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, CircleAlert } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { HeaderBackButton } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useCheckUsername, useSignup } from '@/features/auth/hooks';
import {
  calculatePasswordStrength,
  type PasswordStrength,
  signupSchema,
} from '@/features/auth/schemas';
import { useTheme } from '@/theme';

export function SignupScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const lastNameRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const usernameStatus = useCheckUsername(username);
  const { signUp, isLoading, serverError, clearServerError } = useSignup();

  const passwordStrength: PasswordStrength = calculatePasswordStrength(password);

  const handleUsernameChange = (val: string) => {
    // Automatically lowercase and strip spaces per SCREENS.md S03
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(clean);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
    if (serverError) clearServerError();
  };

  const handleFieldChange = (field: string, setter: (val: string) => void) => (val: string) => {
    setter(val);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (serverError) clearServerError();
  };

  const handleSubmit = async () => {
    clearServerError();
    setFieldErrors({});

    // Client-side validation with zod
    const validation = signupSchema.safeParse({
      firstName,
      lastName,
      username,
      email,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const formatted: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const path = String(issue.path[0]);
        if (!formatted[path]) {
          formatted[path] = issue.message;
        }
      }
      setFieldErrors(formatted);
      return;
    }

    if (usernameStatus === 'taken') {
      setFieldErrors((prev) => ({ ...prev, username: 'Username is already taken' }));
      return;
    }

    const success = await signUp({
      firstName,
      lastName,
      username,
      email,
      password,
    });

    if (success) {
      // Navigate to S04 verify-email screen with ?email= per SPEC/SCREENS.md
      const target = `/(auth)/verify-email?email=${encodeURIComponent(email.trim())}`;
      router.push(target as never);
    }
  };

  const navigateToLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <Screen scroll keyboard padded edges={{ top: true, bottom: true }}>
      <View style={{ gap: theme.spacing.six, paddingBottom: theme.spacing.six }}>
        {/* Top Back Navigation */}
        <View style={{ alignItems: 'flex-start', marginTop: theme.spacing.one }}>
          <HeaderBackButton onPress={() => router.back()} />
        </View>

        {/* Heading Block (matching S03-signup.png) */}
        <View style={{ gap: theme.spacing.one }}>
          <Text variant="display" weight="bold">
            Create your account
          </Text>
          <Text variant="body" tone="muted">
            It takes less than a minute
          </Text>
        </View>

        {/* Server error banner if not field-specific */}
        {serverError && serverError.field === 'root' && (
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
          >
            <CircleAlert size={18} color={theme.colors.destructive} />
            <Text variant="bodyStrong" tone="destructive">
              {serverError.message}
            </Text>
          </View>
        )}

        {/* Form Fields */}
        <View style={{ gap: theme.spacing.four }}>
          {/* First name & Last name row */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.three }}>
            <View style={{ flex: 1 }}>
              <TextField
                label="First name"
                placeholder="Alex"
                value={firstName}
                onChangeText={handleFieldChange('firstName', setFirstName)}
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                onSubmitEditing={() => lastNameRef.current?.focus()}
                error={fieldErrors.firstName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                ref={lastNameRef}
                label="Last name"
                placeholder="Chen"
                value={lastName}
                onChangeText={handleFieldChange('lastName', setLastName)}
                autoCapitalize="words"
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
                error={fieldErrors.lastName}
              />
            </View>
          </View>

          {/* Username Field with live availability */}
          <View style={{ gap: theme.spacing.one }}>
            <TextField
              ref={usernameRef}
              label="Username"
              placeholder="@ alexchen"
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              error={fieldErrors.username || (serverError?.field === 'username' ? serverError.message : undefined)}
            />

            {/* Live availability feedback indicator */}
            {!fieldErrors.username && !serverError?.field && (
              <>
                {usernameStatus === 'available' && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.one,
                      marginTop: theme.spacing.one,
                    }}
                  >
                    <CheckCircle2 size={16} color={theme.colors.foreground} />
                    <Text variant="caption" tone="default">
                      Username is available
                    </Text>
                  </View>
                )}
                {usernameStatus === 'taken' && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.one,
                      marginTop: theme.spacing.one,
                    }}
                  >
                    <CircleAlert size={16} color={theme.colors.destructive} />
                    <Text variant="caption" tone="destructive">
                      Username is already taken
                    </Text>
                  </View>
                )}
                {usernameStatus === 'checking' && (
                  <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing.one }}>
                    Checking availability...
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Email Field */}
          <TextField
            ref={emailRef}
            label="Email"
            placeholder="alex.chen@university.edu"
            value={email}
            onChangeText={handleFieldChange('email', setEmail)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={fieldErrors.email || (serverError?.field === 'email' ? serverError.message : undefined)}
          />

          {/* Password Field with strength meter */}
          <View style={{ gap: theme.spacing.one }}>
            <TextField
              ref={passwordRef}
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={handleFieldChange('password', setPassword)}
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              error={fieldErrors.password}
            />

            {/* Password strength 3-bar indicator matching S03-signup.png */}
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
                  {passwordStrength === 'ok'
                    ? 'Good'
                    : passwordStrength}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password Field */}
          <TextField
            ref={confirmPasswordRef}
            label="Confirm password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={handleFieldChange('confirmPassword', setConfirmPassword)}
            secureToggle
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            error={fieldErrors.confirmPassword}
          />

          {/* Create account button */}
          <View style={{ marginTop: theme.spacing.two }}>
            <Button
              label="Create account"
              size="lg"
              fullWidth
              loading={isLoading}
              onPress={handleSubmit}
            />
          </View>

          {/* Terms & Privacy note */}
          <View
            style={{
              paddingHorizontal: theme.spacing.two,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: theme.spacing.one,
            }}
          >
            <Text
              variant="caption"
              tone="muted"
              style={{ textAlign: 'center', lineHeight: 18 }}
            >
              By continuing you agree to the{' '}
              <Text variant="caption" style={{ textDecorationLine: 'underline' }}>
                Terms
              </Text>{' '}
              and{' '}
              <Text variant="caption" style={{ textDecorationLine: 'underline' }}>
                Privacy Policy
              </Text>
            </Text>
          </View>

          {/* Already have an account footer */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: theme.spacing.one,
              marginTop: theme.spacing.four,
            }}
          >
            <Text variant="body" tone="muted">
              Already have an account?
            </Text>
            <Pressable
              onPress={navigateToLogin}
              accessibilityRole="button"
              accessibilityLabel="Log in"
              hitSlop={8}
            >
              <Text variant="bodyStrong">
                Log in
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}
