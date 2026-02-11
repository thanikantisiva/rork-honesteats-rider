/**
 * Login Screen
 * Phone authentication with status verification
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Phone, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useThemedAlert } from '@/components/ThemedAlert';
import { useAuth } from '@/contexts/AuthContext';
import { riderAuthAPI, userAPI } from '@/lib/api';
import { sendFirebaseOTP, verifyFirebaseOTP } from '@/lib/firebase-auth';
import { requestNotificationPermission, getFCMToken } from '@/services/firebase-messaging';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { YumDudeLogo } from '@/components/YumDudeLogo';
import { riderTheme } from '@/theme/riderTheme';

export default function LoginScreen() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useThemedAlert();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirm, setConfirm] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [riderData, setRiderData] = useState<{ riderId: string; phone: string; name: string } | null>(null);

  const handleSendOTP = async () => {
    if (!phone || phone.length !== 10) {
      showAlert('Invalid Phone', 'Please enter a valid 10-digit mobile number', undefined, 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const phoneNumber = `+91${phone}`;
      const statusResponse = await riderAuthAPI.checkLogin(phoneNumber);

      if (statusResponse.status === 'NOT_FOUND') {
        showAlert(
          'Not Registered',
          statusResponse.message,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Signup',
              style: 'default',
              onPress: () => router.push('/signup'),
            },
          ],
          'warning'
        );
        return;
      }

      if (statusResponse.status === 'SIGNUP_DONE') {
        await AsyncStorage.setItem('@rider_phone', phoneNumber);
        showAlert(
          'Under Verification',
          statusResponse.message,
          [
            {
              text: 'OK',
              style: 'default',
              onPress: () => router.replace('/verification-pending'),
            },
          ],
          'info'
        );
        return;
      }

      if (statusResponse.status === 'REJECTED') {
        showAlert(
          'Application Rejected',
          statusResponse.message,
          [
            { text: 'OK', style: 'default' },
          ],
          'error'
        );
        return;
      }

      const result = await sendFirebaseOTP(phoneNumber);

      if (result.success && result.confirmation) {
        setConfirm(result.confirmation);

        setRiderData({
          riderId: statusResponse.riderId!,
          phone: statusResponse.phone!,
          name: statusResponse.name!,
        });

        if (result.testMessage) {
          showAlert('OTP Sent (Test Mode)', result.testMessage, undefined, 'info');
        } else {
          showAlert('OTP Sent', 'Please enter the 6-digit OTP sent to your phone', undefined, 'success');
        }
      } else {
        showAlert('Error', result.error || 'Failed to send OTP. Please try again.', undefined, 'error');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to send OTP. Please try again.', undefined, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      showAlert('Invalid OTP', 'Please enter the 6-digit OTP', undefined, 'warning');
      return;
    }

    if (!confirm) {
      showAlert('Error', 'Please request OTP first', undefined, 'error');
      return;
    }

    if (!riderData) {
      showAlert('Error', 'Rider data not found. Please try again.', undefined, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyFirebaseOTP(confirm, otp);

      if (!result.success) {
        showAlert('Verification Failed', result.error || 'Invalid OTP', undefined, 'error');
        setIsLoading(false);
        return;
      }

      await login(riderData);
      await registerFCMToken(riderData.phone);
    } catch (error: any) {
      showAlert('Invalid OTP', 'The OTP you entered is incorrect. Please try again.', undefined, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const registerFCMToken = async (phone: string) => {
    try {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        return;
      }

      const fcmToken = await getFCMToken();

      if (!fcmToken) {
        return;
      }

      await userAPI.registerFCMToken(phone, fcmToken);
    } catch (error: any) {
      console.error('Failed to register FCM token:', error);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.content}>
            <View style={styles.headerCard}>
              <View style={styles.logoWrap}><YumDudeLogo size={58} /></View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Login to continue your rider shift</Text>
              <View style={styles.secureTag}>
                <ShieldCheck size={14} color={riderTheme.colors.info} />
                <Text style={styles.secureTagText}>Secure OTP verification</Text>
              </View>
            </View>

            <View style={styles.formCard}>
              {!confirm ? (
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mobile Number</Text>
                    <View style={styles.phoneInput}>
                      <Text style={styles.countryCode}>+91</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="10-digit mobile number"
                        placeholderTextColor={riderTheme.colors.textMuted}
                        value={phone}
                        onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                        keyboardType="phone-pad"
                        maxLength={10}
                        editable={!isLoading}
                      />
                      <Phone size={18} color={riderTheme.colors.textMuted} />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                    onPress={handleSendOTP}
                    disabled={isLoading}
                    activeOpacity={0.88}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.sendButtonText}>Send OTP</Text>
                        <ArrowRight size={20} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Enter OTP</Text>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="123456"
                      placeholderTextColor={riderTheme.colors.textMuted}
                      value={otp}
                      onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isLoading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.verifyButton, isLoading && styles.sendButtonDisabled]}
                    onPress={handleVerifyOTP}
                    disabled={isLoading}
                    activeOpacity={0.88}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify & Login</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={() => setConfirm(null)}
                    disabled={isLoading}
                  >
                    <Text style={styles.resendButtonText}>Change Number</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.signupLink}
              onPress={() => router.push('/signup')}
            >
              <Text style={styles.signupLinkText}>
                New rider? <Text style={styles.signupLinkBold}>Signup here</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AlertComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: riderTheme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerCard: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.lg,
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
    padding: 20,
    alignItems: 'center',
    ...riderTheme.shadow.card,
    marginBottom: 16,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: riderTheme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
  },
  secureTag: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: riderTheme.radius.full,
    backgroundColor: riderTheme.colors.infoSoft,
  },
  secureTagText: {
    color: riderTheme.colors.info,
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.lg,
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
    padding: 18,
    ...riderTheme.shadow.soft,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.textSecondary,
    letterSpacing: 0.2,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: riderTheme.colors.surface,
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
    borderRadius: riderTheme.radius.md,
    paddingHorizontal: 12,
    gap: 10,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: riderTheme.colors.textPrimary,
  },
  otpInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    letterSpacing: 6,
    color: riderTheme.colors.textPrimary,
    backgroundColor: riderTheme.colors.surface,
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
    borderRadius: riderTheme.radius.md,
    textAlign: 'center',
    fontWeight: '700',
  },
  sendButton: {
    backgroundColor: riderTheme.colors.primary,
    paddingVertical: 15,
    borderRadius: riderTheme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifyButton: {
    backgroundColor: riderTheme.colors.success,
    paddingVertical: 15,
    borderRadius: riderTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendButtonText: {
    fontSize: 13,
    color: riderTheme.colors.primary,
    fontWeight: '700',
  },
  signupLink: {
    alignItems: 'center',
    marginTop: 18,
  },
  signupLinkText: {
    fontSize: 14,
    color: riderTheme.colors.textSecondary,
  },
  signupLinkBold: {
    color: riderTheme.colors.primary,
    fontWeight: '700',
  },
});
