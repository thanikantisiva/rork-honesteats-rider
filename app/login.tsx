/**
 * Login Screen
 * Phone auth with clean red hero + 4-box OTP UX
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ShieldCheck, ArrowRight, ChevronLeft, CheckCircle2, Wifi, WifiOff } from 'lucide-react-native';
import { useThemedAlert } from '@/components/ThemedAlert';
import { useAuth } from '@/contexts/AuthContext';
import { riderAuthAPI, authOTPAPI, setApiBaseUrlForPhone, api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { YumDudeLogo } from '@/components/YumDudeLogo';
import { riderTheme } from '@/theme/riderTheme';

const OTP_SEND_COOLDOWN_STORAGE_KEY = '@rider_otp_send_cooldown_until';
const DEFAULT_OTP_RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;

function isOtpRateLimited(input: unknown): boolean {
  const message =
    input instanceof Error
      ? input.message
      : typeof input === 'string'
        ? input
        : typeof input === 'object' && input !== null && 'message' in input
          ? String((input as { message?: unknown }).message ?? '')
          : String(input ?? '');

  return /too many attempts|too many requests|try again later|429/i.test(message);
}

export default function LoginScreen() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useThemedAlert();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const otpRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [riderData, setRiderData] = useState<{ riderId: string; phone: string; name: string } | null>(null);
  const [otpCooldownUntil, setOtpCooldownUntil] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [loginReady, setLoginReady] = useState(false);
  const [wantOnline, setWantOnline] = useState(true);

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const formY = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(formY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [formOpacity, formY, heroOpacity]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(OTP_SEND_COOLDOWN_STORAGE_KEY);
        const parsed = raw ? Number(raw) : NaN;
        if (mounted && Number.isFinite(parsed) && parsed > Date.now()) {
          setOtpCooldownUntil(parsed);
        }
      } catch {
        // Ignore cooldown restore failures.
      }
    })();

    const interval = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!otpCooldownUntil || otpCooldownUntil > Date.now()) {
      return;
    }

    setOtpCooldownUntil(null);
    void AsyncStorage.removeItem(OTP_SEND_COOLDOWN_STORAGE_KEY).catch(() => undefined);
  }, [nowTs, otpCooldownUntil]);

  const otp = otpDigits.join('');
  const cooldownSecondsLeft = otpCooldownUntil
    ? Math.max(0, Math.ceil((otpCooldownUntil - nowTs) / 1000))
    : 0;
  const isOtpSendCoolingDown = cooldownSecondsLeft > 0;

  const persistOtpCooldown = async (until: number) => {
    setOtpCooldownUntil(until);
    await AsyncStorage.setItem(OTP_SEND_COOLDOWN_STORAGE_KEY, String(until));
  };

  const clearOtpCooldown = async () => {
    setOtpCooldownUntil(null);
    await AsyncStorage.removeItem(OTP_SEND_COOLDOWN_STORAGE_KEY);
  };

  const handleOtpChange = (digit: string, index: number) => {
    const clean = digit.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);
    if (clean && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      const next = [...otpDigits];
      next[index - 1] = '';
      setOtpDigits(next);
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleSendOTP = async () => {
    if (isOtpSendCoolingDown) {
      showAlert(
        'Please wait',
        `Too many OTP attempts. Try again in ${cooldownSecondsLeft} second${cooldownSecondsLeft === 1 ? '' : 's'}.`,
        undefined,
        'warning',
      );
      return;
    }

    if (!phone || phone.length !== 10) {
      showAlert('Invalid Phone', 'Please enter a valid 10-digit mobile number', undefined, 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const phoneNumber = `+91${phone}`;
      const otpPhone = phone;
      setApiBaseUrlForPhone(otpPhone);

      const statusResponse = await riderAuthAPI.checkLogin(phoneNumber);

      if (statusResponse.status === 'NOT_FOUND') {
        showAlert(
          'Not Registered',
          statusResponse.message ?? 'You are not registered as a rider.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Signup',
              style: 'default',
              onPress: () => router.push('/signup'),
            },
          ],
          'warning',
        );
        return;
      }

      if (statusResponse.status === 'SIGNUP_DONE') {
        await AsyncStorage.setItem('@rider_phone', phoneNumber);
        showAlert(
          'Under Verification',
          statusResponse.message ?? 'Your application is under review.',
          [
            {
              text: 'OK',
              style: 'default',
              onPress: () => router.replace('/verification-pending'),
            },
          ],
          'info',
        );
        return;
      }

      if (statusResponse.status === 'REJECTED') {
        showAlert(
          'Application Rejected',
          statusResponse.message ?? 'Your application was not approved.',
          [{ text: 'OK', style: 'default' }],
          'error',
        );
        return;
      }

      const result = await authOTPAPI.sendOtp(otpPhone);

      if (result.success) {
        setOtpSent(true);
        if (otpCooldownUntil) {
          await clearOtpCooldown();
        }

        setRiderData({
          riderId: statusResponse.riderId!,
          phone: statusResponse.phone!,
          name: statusResponse.name!,
        });
        return;
      }

      const message = result.message || result.error || 'Failed to send OTP. Please try again.';
      if (isOtpRateLimited(message)) {
        await persistOtpCooldown(Date.now() + DEFAULT_OTP_RATE_LIMIT_COOLDOWN_MS);
        showAlert(
          'Too many attempts',
          'You have requested OTP too many times. Please wait 5 minutes before trying again.',
          undefined,
          'warning',
        );
      } else {
        console.warn('OTP send was rejected:', message);
        showAlert('Error', message, undefined, 'error');
      }
    } catch (error: any) {
      if (isOtpRateLimited(error)) {
        await persistOtpCooldown(Date.now() + DEFAULT_OTP_RATE_LIMIT_COOLDOWN_MS);
        showAlert(
          'Too many attempts',
          'You have requested OTP too many times. Please wait 5 minutes before trying again.',
          undefined,
          'warning',
        );
      } else {
        showAlert('Error', error.message || 'Failed to send OTP. Please try again.', undefined, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 4) {
      showAlert('Invalid OTP', 'Please enter the 4-digit OTP', undefined, 'warning');
      return;
    }

    if (!otpSent) {
      showAlert('Error', 'Please request OTP first', undefined, 'error');
      return;
    }

    if (!riderData) {
      showAlert('Error', 'Rider data not found. Please try again.', undefined, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const otpPhone = phone;
      setApiBaseUrlForPhone(otpPhone);
      const result = await authOTPAPI.verifyOtp(otpPhone, otp);

      if (!result.success) {
        showAlert('Verification Failed', result.error || 'Invalid OTP', undefined, 'error');
        setIsLoading(false);
        return;
      }

      if (result.token) {
        await AsyncStorage.setItem('@jwt_token', result.token);
        api.setJWTToken(result.token);
      }

      setLoginReady(true);
    } catch {
      showAlert('Invalid OTP', 'The OTP you entered is incorrect. Please try again.', undefined, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterApp = async () => {
    if (!riderData) return;
    setIsLoading(true);
    try {
      if (wantOnline) {
        await AsyncStorage.setItem('@rider_go_online_on_login', 'true');
      } else {
        await AsyncStorage.removeItem('@rider_go_online_on_login');
      }
      await login(riderData);
    } catch {
      showAlert('Error', 'Failed to enter app. Please try again.', undefined, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setOtpSent(false);
    setOtpDigits(['', '', '', '']);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.hero, { opacity: heroOpacity }]}>
            <View style={styles.heroDec1} />
            <View style={styles.heroDec2} />
            <View style={styles.logoRing}>
              <YumDudeLogo size={64} color="#FFFFFF" accent="#FFC52E" />
            </View>
            <Text style={styles.heroTitle}>
              {loginReady ? "You're In!" : otpSent ? 'Enter OTP' : 'Welcome Back'}
            </Text>
            <Text style={styles.heroSub}>
              {loginReady
                ? `Ready to ride, ${riderData?.name?.split(' ')[0] ?? 'Rider'}`
                : otpSent
                ? `Sent to +91 ${phone}`
                : 'Login to your rider account'}
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formCard,
              { opacity: formOpacity, transform: [{ translateY: formY }] },
            ]}
          >
            <View style={styles.formHandle} />
            {loginReady ? (
              <>
                {/* ── SUCCESS PANEL ── */}
                <View style={styles.successPanel}>
                  <View style={styles.successIconWrap}>
                    <CheckCircle2 size={44} color={riderTheme.colors.success} strokeWidth={2} />
                  </View>
                  <Text style={styles.successTitle}>OTP Verified</Text>
                  <Text style={styles.successSub}>Set your status before entering the app</Text>
                </View>

                {/* ── ONLINE TOGGLE ── */}
                <View style={[styles.onlineToggleCard, wantOnline && styles.onlineToggleCardOn]}>
                  <View style={styles.onlineToggleLeft}>
                    <View style={[styles.onlineIconWrap, wantOnline ? styles.onlineIconWrapOn : styles.onlineIconWrapOff]}>
                      {wantOnline
                        ? <Wifi size={18} color={riderTheme.colors.success} strokeWidth={2.5} />
                        : <WifiOff size={18} color={riderTheme.colors.textMuted} strokeWidth={2.5} />
                      }
                    </View>
                    <View style={styles.onlineToggleText}>
                      <Text style={styles.onlineToggleTitle}>
                        {wantOnline ? 'Go Online' : 'Stay Offline'}
                      </Text>
                      <Text style={styles.onlineToggleDesc}>
                        {wantOnline ? 'Start receiving orders right away' : 'Toggle from home when ready'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={wantOnline}
                    onValueChange={setWantOnline}
                    trackColor={{ false: riderTheme.colors.border, true: riderTheme.colors.success }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={riderTheme.colors.border}
                  />
                </View>

                {/* ── ENTER APP ── */}
                <TouchableOpacity
                  style={[styles.ctaBtn, isLoading && styles.ctaBtnDisabled]}
                  onPress={handleEnterApp}
                  disabled={isLoading}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.ctaBtnText}>Enter App</Text>
                      <View style={styles.ctaBtnArrow}>
                        <ArrowRight size={18} color="#E8352A" strokeWidth={2.5} />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : !otpSent ? (
              <>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryBadge}>
                    <Text style={styles.countryCode}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="10-digit number"
                    placeholderTextColor={riderTheme.colors.textMuted}
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.ctaBtn,
                    (isLoading || isOtpSendCoolingDown) && styles.ctaBtnDisabled,
                  ]}
                  onPress={handleSendOTP}
                  disabled={isLoading || isOtpSendCoolingDown}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.ctaBtnText}>
                        {isOtpSendCoolingDown ? `Retry in ${cooldownSecondsLeft}s` : 'Send OTP'}
                      </Text>
                      <View style={styles.ctaBtnArrow}>
                        <ArrowRight size={18} color="#E8352A" strokeWidth={2.5} />
                      </View>
                    </>
                  )}
                </TouchableOpacity>

                {isOtpSendCoolingDown ? (
                  <Text style={styles.cooldownHint}>
                    OTP requests are temporarily paused because too many attempts were made.
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.backRow} onPress={handleBackToPhone} disabled={isLoading}>
                  <ChevronLeft size={18} color={riderTheme.colors.textSecondary} strokeWidth={2.5} />
                  <Text style={styles.backText}>Change number</Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>4-Digit OTP</Text>

                <View style={styles.otpRow}>
                  {otpDigits.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={otpRefs[i]}
                      style={[styles.otpBox, digit ? styles.otpBoxFilled : undefined]}
                      value={digit}
                      onChangeText={(t) => handleOtpChange(t, i)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      editable={!isLoading}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.ctaBtn, styles.ctaBtnGreen, isLoading && styles.ctaBtnDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={isLoading || otp.length < 4}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.ctaBtnText}>Verify & Login</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {!loginReady && <View style={styles.secureBadge}>
              <ShieldCheck size={13} color={riderTheme.colors.info} strokeWidth={2.5} />
              <Text style={styles.secureBadgeText}>Secured with OTP verification</Text>
            </View>}
          </Animated.View>

          {!loginReady && (
            <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/signup')}>
              <Text style={styles.footerLinkText}>
                New rider? <Text style={styles.footerLinkBold}>Sign up here</Text>
              </Text>
            </TouchableOpacity>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AlertComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A0C08',
  },
  keyboardView: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 24,
    backgroundColor: '#1A0C08',
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 14,
    letterSpacing: 0.3,
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 197, 46, 0.85)',
    marginTop: 5,
    letterSpacing: 0.2,
  },
  formCard: {
    flex: 1,
    backgroundColor: '#FFFDF7',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: riderTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: riderTheme.colors.border,
    overflow: 'hidden',
  },
  countryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRightWidth: 1,
    borderRightColor: riderTheme.colors.border,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: riderTheme.colors.textPrimary,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: riderTheme.colors.textSecondary,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  otpBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: riderTheme.colors.border,
    backgroundColor: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: '#E8352A',
    backgroundColor: '#FCECEA',
  },
  ctaBtn: {
    backgroundColor: '#E8352A',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#E8352A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 4,
  },
  ctaBtnGreen: {
    backgroundColor: riderTheme.colors.success,
    shadowColor: riderTheme.colors.success,
  },
  ctaBtnDisabled: {
    opacity: 0.55,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  ctaBtnArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFC52E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 6,
  },
  secureBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: riderTheme.colors.textMuted,
  },
  cooldownHint: {
    fontSize: 12,
    lineHeight: 18,
    color: riderTheme.colors.warningDark,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  footerLink: {
    backgroundColor: '#1A0C08',
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 10,
  },
  footerLinkText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  footerLinkBold: {
    color: '#FFC52E',
    fontWeight: '700',
  },
  successPanel: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  successIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: riderTheme.colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: riderTheme.colors.success,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: riderTheme.colors.textPrimary,
    letterSpacing: 0.2,
  },
  successSub: {
    fontSize: 13,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  onlineToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: riderTheme.colors.border,
    padding: 14,
    gap: 12,
    shadowColor: '#1A0C08',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  onlineToggleCardOn: {
    borderColor: riderTheme.colors.success,
    backgroundColor: riderTheme.colors.successSoft,
  },
  onlineToggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onlineIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  onlineIconWrapOn: {
    backgroundColor: riderTheme.colors.successSoft,
    borderColor: riderTheme.colors.success,
  },
  onlineIconWrapOff: {
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderColor: riderTheme.colors.border,
  },
  onlineToggleText: {
    flex: 1,
    gap: 2,
  },
  onlineToggleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
  },
  onlineToggleDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
    lineHeight: 17,
  },
  heroDec1: {
    position: 'absolute',
    top: -55,
    right: -55,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(232, 53, 42, 0.18)',
  },
  heroDec2: {
    position: 'absolute',
    bottom: -25,
    left: -35,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 197, 46, 0.08)',
  },
  logoRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 197, 46, 0.4)',
    marginBottom: 4,
  },
  formHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: riderTheme.colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
});
