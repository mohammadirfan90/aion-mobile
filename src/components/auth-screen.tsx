/* eslint-disable react/no-unescaped-entities -- visual reference; cleaned up in P1-X1 */
import React, { useState, useRef } from 'react';
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
  StatusBar,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

// --- Custom SVG Icons ---
function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
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
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="#000000">
      <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-.96.04-2.13.64-2.82 1.45-.62.72-1.16 1.88-1.01 3 1.07.08 2.17-.54 2.84-1.36z" />
    </Svg>
  );
}

function EyeOffIcon({ color = "#94A3B8" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <Path d="M1 1l22 22" />
    </Svg>
  );
}

function EyeIcon({ color = "#94A3B8" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    </Svg>
  );
}

function SuccessCheckIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <Path d="M22 4L12 14.01l-3-3" />
    </Svg>
  );
}

export type AuthScreenStep = 'login' | 'signup' | 'otp' | 'success';

export default function AuthScreen() {
  const [step, setStep] = useState<AuthScreenStep>('login');

  // Form Fields
  const [email, setEmail] = useState('you@example.com');
  const [password, setPassword] = useState('••••••••••••');
  const [confirmPassword, setConfirmPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // OTP Box Inputs
  const [otp, setOtp] = useState(['1', '0', '0', '0', '0']);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 4) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleAction = () => {
    setMessage(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (step === 'login') {
        setStep('success');
      } else if (step === 'signup') {
        setStep('otp');
      } else if (step === 'otp') {
        setStep('success');
      }
    }, 700);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
            {/* Header Section */}
            {step !== 'success' && (
              <View style={styles.header}>
                <Text style={styles.title}>
                  {step === 'login' && 'Get Started With Your Learning Journey'}
                  {step === 'signup' && 'Create An Account'}
                  {step === 'otp' && 'Enter Code Here'}
                </Text>
                <Text style={styles.subtitle}>
                  {step === 'login' && 'Sign in to your Account'}
                  {step === 'signup' && 'Sign up for your Account'}
                  {step === 'otp' && (
                    <Text style={styles.otpSubtitleText}>
                      Please enter the code we just sent to email{' '}
                      <Text style={styles.emailHighlight}>{email}</Text>
                    </Text>
                  )}
                </Text>
              </View>
            )}

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

            {/* Segmented Pill Selector (Login / Sign Up) */}
            {(step === 'login' || step === 'signup') && (
              <View style={styles.pillContainer}>
                <TouchableOpacity
                  style={[styles.pillButton, step === 'login' && styles.pillActive]}
                  onPress={() => { setStep('login'); setMessage(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, step === 'login' && styles.pillTextActive]}>
                    Login
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillButton, step === 'signup' && styles.pillActive]}
                  onPress={() => { setStep('signup'); setMessage(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, step === 'signup' && styles.pillTextActive]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* --- STEP 1: LOGIN & STEP 2: SIGN UP FIELDS --- */}
            {(step === 'login' || step === 'signup') && (
              <View style={styles.formGroup}>
                {/* Email Field */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === 'email' && styles.inputWrapperFocused,
                    ]}
                  >
                    <TextInput
                      style={styles.textInput}
                      placeholder="you@example.com"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setFocusedInput(null)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === 'password' && styles.inputWrapperFocused,
                    ]}
                  >
                    <TextInput
                      style={styles.textInput}
                      placeholder="••••••••••••"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIconButton}
                    >
                      {showPassword ? <EyeIcon color="#64748B" /> : <EyeOffIcon color="#64748B" />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Field (Sign Up Only) */}
                {step === 'signup' && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Confirm Password</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedInput === 'confirmPassword' && styles.inputWrapperFocused,
                      ]}
                    >
                      <TextInput
                        style={styles.textInput}
                        placeholder="••••••••••••"
                        placeholderTextColor="#94A3B8"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        onFocus={() => setFocusedInput('confirmPassword')}
                        onBlur={() => setFocusedInput(null)}
                        secureTextEntry={!showConfirmPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeIconButton}
                      >
                        {showConfirmPassword ? <EyeIcon color="#64748B" /> : <EyeOffIcon color="#64748B" />}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Forgot Passwords Link (Login Only) */}
                {step === 'login' && (
                  <TouchableOpacity
                    style={styles.forgotContainer}
                    onPress={() => setStep('otp')}
                  >
                    <Text style={styles.forgotText}>Forgot Passwords?</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* --- STEP 3: OTP VERIFICATION --- */}
            {step === 'otp' && (
              <View style={styles.otpSection}>
                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <View key={index} style={styles.otpBox}>
                      <TextInput
                        ref={(ref) => { otpRefs.current[index] = ref; }}
                        style={styles.otpInput}
                        value={digit}
                        onChangeText={(text) => handleOtpChange(text, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                      />
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.requestAgainContainer}>
                  <Text style={styles.requestAgainText}>Request Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* --- STEP 4: SUCCESS VIEW --- */}
            {step === 'success' && (
              <View style={styles.successContainer}>
                <View style={styles.successBadge}>
                  <SuccessCheckIcon />
                </View>

                <Text style={styles.successTitle}>Success!</Text>
                <Text style={styles.successSubtitle}>
                  You have successfully logged in to your account.
                </Text>

                <TouchableOpacity
                  style={styles.primaryActionButton}
                  activeOpacity={0.85}
                  onPress={() => setStep('login')}
                >
                  <Text style={styles.primaryActionButtonText}>Home</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Primary Action Button (Login / Sign Up / Confirm Code) */}
            {step !== 'success' && (
              <TouchableOpacity
                style={styles.primaryActionButton}
                activeOpacity={0.85}
                onPress={handleAction}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionButtonText}>
                    {step === 'login' && 'Login'}
                    {step === 'signup' && 'Sign Up'}
                    {step === 'otp' && 'Confirm Code'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* --- SOCIAL SIGN IN SECTION (Login & Sign Up steps) --- */}
            {(step === 'login' || step === 'signup') && (
              <>
                <View style={styles.orDividerContainer}>
                  <View style={styles.orDividerLine} />
                  <Text style={styles.orDividerText}>or continue with</Text>
                  <View style={styles.orDividerLine} />
                </View>

                <View style={styles.socialRow}>
                  <TouchableOpacity style={styles.socialPillButton} activeOpacity={0.8}>
                    <AppleIcon />
                    <Text style={styles.socialPillText}>Apple</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.socialPillButton} activeOpacity={0.8}>
                    <GoogleIcon />
                    <Text style={styles.socialPillText}>Google</Text>
                  </TouchableOpacity>
                </View>

                {/* Footer Account Navigation Link */}
                <View style={styles.bottomLinkContainer}>
                  {step === 'login' ? (
                    <Text style={styles.bottomLinkText}>
                      Don't have an account?{' '}
                      <Text
                        style={styles.boldActionLink}
                        onPress={() => setStep('signup')}
                      >
                        Sign Up
                      </Text>
                    </Text>
                  ) : (
                    <Text style={styles.bottomLinkText}>
                      Already have an account?{' '}
                      <Text
                        style={styles.boldActionLink}
                        onPress={() => setStep('login')}
                      >
                        Log in
                      </Text>
                    </Text>
                  )}
                </View>
              </>
            )}

            {/* OTP Page Bottom Link */}
            {step === 'otp' && (
              <View style={styles.bottomLinkContainer}>
                <Text style={styles.bottomLinkText}>
                  Already have an account?{' '}
                  <Text
                    style={styles.boldActionLink}
                    onPress={() => setStep('login')}
                  >
                    Log in
                  </Text>
                </Text>
              </View>
            )}

            {/* Clean Copyright Footer */}
            <View style={styles.footerContainer}>
              <Text style={styles.copyrightText}>
                © 2026 Aion. All rights reserved.
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
    paddingHorizontal: 22,
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  otpSubtitleText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  emailHighlight: {
    color: '#0F172A',
    fontWeight: '600',
  },
  messageBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
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

  // Segmented Pill Selector
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 28,
    padding: 4,
    marginBottom: 26,
  },
  pillButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  pillActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Form Fields
  formGroup: {
    gap: 18,
    marginBottom: 22,
  },
  fieldContainer: {
    gap: 7,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  inputWrapper: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  inputWrapperFocused: {
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    height: '100%',
  },
  eyeIconButton: {
    padding: 6,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  forgotText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // Primary Action Button (Clean Slate/Dark Pill)
  primaryActionButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Or Divider Section
  orDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 26,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orDividerText: {
    fontSize: 12,
    color: '#94A3B8',
    marginHorizontal: 12,
  },

  // Social Sign In Row
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  socialPillButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialPillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },

  // Footer Link
  bottomLinkContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  bottomLinkText: {
    fontSize: 14,
    color: '#64748B',
  },
  boldActionLink: {
    fontWeight: '700',
    color: '#0F172A',
  },

  // OTP Verification Flow
  otpSection: {
    marginBottom: 28,
    alignItems: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  otpBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  requestAgainContainer: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  requestAgainText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // Success Screen State
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  successBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 36,
  },
  footerContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
