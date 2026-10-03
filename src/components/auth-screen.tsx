import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  SafeAreaView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Custom SVG Icons
function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#000000">
      <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-.96.04-2.13.64-2.82 1.45-.62.72-1.16 1.88-1.01 3 1.07.08 2.17-.54 2.84-1.36z" />
    </Svg>
  );
}

function MailIcon({ color = "#9CA3AF" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <Path d="M22 6l-10 7L2 6" />
    </Svg>
  );
}

function LockIcon({ color = "#9CA3AF" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 11H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2z" />
      <Path d="M7 11V7a5 5 0 0110 0v4" />
    </Svg>
  );
}

function UserIcon({ color = "#9CA3AF" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <Path d="M12 11a4 4 0 100-8 4 4 0 000 8z" />
    </Svg>
  );
}

function EyeIcon({ color = "#64748B" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    </Svg>
  );
}

function EyeOffIcon({ color = "#64748B" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <Path d="M1 1l22 22" />
    </Svg>
  );
}

function CheckCircleIcon({ color = "#10B981" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <Path d="M22 4L12 14.01l-3-3" />
    </Svg>
  );
}

function ClearIcon({ color = "#9CA3AF" }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 6L6 18" />
      <Path d="M6 6l12 12" />
    </Svg>
  );
}

function ChevronRightIcon({ color = "#FFFFFF" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

export type AuthMode = 'signin' | 'signup' | 'forgot';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fast Validation Checkers
  const isEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const passwordStrength = useMemo(() => {
    if (!password) return null;
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return { label: 'Strong', color: '#10B981' };
    if (password.length >= 6) return { label: 'Medium', color: '#F59E0B' };
    return { label: 'Weak', color: '#EF4444' };
  }, [password]);

  const handleSocialSignIn = (provider: 'google' | 'apple') => {
    setMessage(null);
    setSocialLoading(provider);
    setTimeout(() => {
      setSocialLoading(null);
      setMessage({
        text: `${provider === 'google' ? 'Google' : 'Apple'} Sign-In initiated successfully!`,
        type: 'success',
      });
    }, 800);
  };

  const handleSubmit = () => {
    setMessage(null);

    if (!email) {
      setMessage({ text: 'Please enter your email address.', type: 'error' });
      return;
    }

    if (!isEmailValid) {
      setMessage({ text: 'Please enter a valid email address (e.g., name@domain.com).', type: 'error' });
      return;
    }

    if (mode !== 'forgot' && !password) {
      setMessage({ text: 'Please enter your password.', type: 'error' });
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setMessage({ text: 'Please enter your full name.', type: 'error' });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (mode === 'signin') {
        setMessage({ text: `Welcome back, ${email.split('@')[0]}! Signed in successfully.`, type: 'success' });
      } else if (mode === 'signup') {
        setMessage({ text: 'Account created successfully! Welcome to Aion.', type: 'success' });
      } else {
        setMessage({ text: 'Password reset link sent to your email address.', type: 'success' });
      }
    }, 800);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardContainer}>
            {/* Fast Mode Toggle Pills */}
            <View style={styles.pillContainer}>
              <TouchableOpacity
                style={[styles.pillButton, mode === 'signin' && styles.pillActive]}
                onPress={() => { setMode('signin'); setMessage(null); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, mode === 'signin' && styles.pillTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pillButton, mode === 'signup' && styles.pillActive]}
                onPress={() => { setMode('signup'); setMessage(null); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, mode === 'signup' && styles.pillTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Header Section */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {mode === 'signin' && 'Welcome back'}
                {mode === 'signup' && 'Create an account'}
                {mode === 'forgot' && 'Reset password'}
              </Text>
              <Text style={styles.subtitle}>
                {mode === 'signin' && 'Sign in to continue your learning journey.'}
                {mode === 'signup' && 'Sign up to start your learning journey.'}
                {mode === 'forgot' && 'Enter your email to receive a password reset link.'}
              </Text>
            </View>

            {/* Notification Banner */}
            {message && (
              <View
                style={[
                  styles.messageBanner,
                  message.type === 'error' ? styles.errorMessage : styles.successMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.type === 'error' ? styles.errorText : styles.successText,
                  ]}
                >
                  {message.text}
                </Text>
              </View>
            )}

            {/* Social OAuth Buttons */}
            {mode !== 'forgot' && (
              <>
                <View style={styles.socialRow}>
                  <TouchableOpacity
                    style={[styles.googleButton, styles.socialFlex]}
                    activeOpacity={0.8}
                    onPress={() => handleSocialSignIn('google')}
                    disabled={!!socialLoading || loading}
                  >
                    {socialLoading === 'google' ? (
                      <ActivityIndicator size="small" color="#1F2937" />
                    ) : (
                      <>
                        <GoogleIcon />
                        <Text style={styles.googleButtonText}>Sign in with Google</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={[styles.appleButton]}
                      activeOpacity={0.8}
                      onPress={() => handleSocialSignIn('apple')}
                      disabled={!!socialLoading || loading}
                    >
                      {socialLoading === 'apple' ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <AppleIcon />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Divider Line */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR SIGN IN WITH EMAIL</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            )}

            {/* Form Fields */}
            <View style={styles.formGroup}>
              {/* Full Name Field (Sign Up mode) */}
              {mode === 'signup' && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === 'name' && styles.inputWrapperFocused,
                    ]}
                  >
                    <View style={styles.inputIcon}>
                      <UserIcon color={focusedInput === 'name' ? '#0F172A' : '#9CA3AF'} />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="John Doe"
                      placeholderTextColor="#9CA3AF"
                      value={name}
                      onChangeText={setName}
                      onFocus={() => setFocusedInput('name')}
                      onBlur={() => setFocusedInput(null)}
                      autoCapitalize="words"
                    />
                    {name.length > 0 && (
                      <TouchableOpacity onPress={() => setName('')} style={styles.clearBtn}>
                        <ClearIcon />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Email Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedInput === 'email' && styles.inputWrapperFocused,
                  ]}
                >
                  <View style={styles.inputIcon}>
                    <MailIcon color={focusedInput === 'email' ? '#0F172A' : '#9CA3AF'} />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="you@example.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {isEmailValid ? (
                    <View style={styles.validationIcon}>
                      <CheckCircleIcon />
                    </View>
                  ) : email.length > 0 ? (
                    <TouchableOpacity onPress={() => setEmail('')} style={styles.clearBtn}>
                      <ClearIcon />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Password Field */}
              {mode !== 'forgot' && (
                <View style={styles.fieldContainer}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>Password</Text>
                    {mode === 'signin' && (
                      <TouchableOpacity onPress={() => { setMode('forgot'); setMessage(null); }}>
                        <Text style={styles.forgotText}>Forgot password?</Text>
                      </TouchableOpacity>
                    )}
                    {mode === 'signup' && passwordStrength && (
                      <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                        {passwordStrength.label}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === 'password' && styles.inputWrapperFocused,
                    ]}
                  >
                    <View style={styles.inputIcon}>
                      <LockIcon color={focusedInput === 'password' ? '#0F172A' : '#9CA3AF'} />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="••••••••"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeIconButton}
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {showPassword ? <EyeOffIcon color="#64748B" /> : <EyeIcon color="#64748B" />}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Primary Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={loading || !!socialLoading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.submitButtonContent}>
                  <Text style={styles.submitButtonText}>
                    {mode === 'signin' && 'Sign in'}
                    {mode === 'signup' && 'Create account'}
                    {mode === 'forgot' && 'Send reset link'}
                  </Text>
                  <ChevronRightIcon color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Bottom Navigation Toggle */}
            <View style={styles.toggleContainer}>
              {mode === 'signin' && (
                <Text style={styles.toggleText}>
                  Don't have an account?{' '}
                  <Text
                    style={styles.toggleLinkBold}
                    onPress={() => { setMode('signup'); setMessage(null); }}
                  >
                    Create one
                  </Text>
                </Text>
              )}
              {mode === 'signup' && (
                <Text style={styles.toggleText}>
                  Already have an account?{' '}
                  <Text
                    style={styles.toggleLinkBold}
                    onPress={() => { setMode('signin'); setMessage(null); }}
                  >
                    Sign in
                  </Text>
                </Text>
              )}
              {mode === 'forgot' && (
                <Text style={styles.toggleText}>
                  Remembered your password?{' '}
                  <Text
                    style={styles.toggleLinkBold}
                    onPress={() => { setMode('signin'); setMessage(null); }}
                  >
                    Back to Sign in
                  </Text>
                </Text>
              )}
            </View>

            {/* reCAPTCHA Disclaimer */}
            <Text style={styles.recaptchaText}>
              Protected by reCAPTCHA — the Google Privacy Policy and Terms of Service apply.
            </Text>

            {/* Footer Copyright */}
            <View style={styles.footerContainer}>
              <Text style={styles.copyrightText}>
                © 2026 Aion. All rights reserved.
              </Text>
              <Text style={styles.brandingText}>
                A product of <Text style={styles.brandingBold}>Chronostrider Technologies.</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  pillButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#0F172A',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 22,
  },
  messageBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorMessage: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
  },
  successMessage: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    color: '#991B1B',
  },
  successText: {
    color: '#166534',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialFlex: {
    flex: 1,
  },
  googleButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  appleButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginHorizontal: 12,
    letterSpacing: 0.6,
  },
  formGroup: {
    gap: 18,
    marginBottom: 24,
  },
  fieldContainer: {
    gap: 7,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrapper: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputWrapperFocused: {
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 0,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  validationIcon: {
    padding: 4,
  },
  eyeIconButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#5C5E62',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toggleContainer: {
    marginTop: 22,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: '#64748B',
  },
  toggleLinkBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  recaptchaText: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 17,
    paddingHorizontal: 10,
  },
  footerContainer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 4,
  },
  copyrightText: {
    fontSize: 13,
    color: '#64748B',
  },
  brandingText: {
    fontSize: 13,
    color: '#64748B',
  },
  brandingBold: {
    fontWeight: '700',
    color: '#334155',
  },
});
