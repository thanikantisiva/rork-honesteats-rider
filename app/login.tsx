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
import { useRouter, Stack } from 'expo-router';
import { Phone, ArrowRight } from 'lucide-react-native';
import { useThemedAlert } from '@/components/ThemedAlert';
import { useAuth } from '@/contexts/AuthContext';
import { riderAuthAPI, userAPI } from '@/lib/api';
import { sendFirebaseOTP, verifyFirebaseOTP } from '@/lib/firebase-auth';
import { requestNotificationPermission, getFCMToken } from '@/services/firebase-messaging';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      
      // Check if rider can login (send with +91 prefix)
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

      // Status is APPROVED - proceed with OTP
      console.log('📤 Sending OTP to rider:', phoneNumber);
      const result = await sendFirebaseOTP(phoneNumber);
      
      if (result.success && result.confirmation) {
        console.log('✅ OTP sent successfully');
        setConfirm(result.confirmation);
        
        // Store rider data temporarily (will be saved to context after OTP verification)
        setRiderData({
          riderId: statusResponse.riderId!,
          phone: statusResponse.phone!,
          name: statusResponse.name!,
        });

        // Show test message for test numbers
        if (result.testMessage) {
          showAlert('OTP Sent (Test Mode)', result.testMessage, undefined, 'info');
        } else {
          showAlert('OTP Sent', 'Please enter the 6-digit OTP sent to your phone', undefined, 'success');
        }
      } else {
        console.error('❌ Failed to send OTP:', result.error);
        showAlert('Error', result.error || 'Failed to send OTP. Please try again.', undefined, 'error');
      }
    } catch (error: any) {
      console.error('Send OTP error:', error);
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
      console.log('🔐 Verifying OTP...');
      const result = await verifyFirebaseOTP(confirm, otp);
      
      if (!result.success) {
        showAlert('Verification Failed', result.error || 'Invalid OTP', undefined, 'error');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ OTP verified successfully');
      
      // Update AuthContext with rider data - this will trigger navigation
      await login(riderData);
      
      // Register FCM token for push notifications
      await registerFCMToken(riderData.phone);
      
      console.log('✅ Logged in successfully, redirecting to home...');
      
      // Navigation will be handled automatically by _layout.tsx
      // based on isLoggedIn state change
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      showAlert('Invalid OTP', 'The OTP you entered is incorrect. Please try again.', undefined, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const registerFCMToken = async (phone: string) => {
    try {
      console.log('📱 Starting FCM token registration for rider:', phone);
      
      // Request permission first
      console.log('🔔 Requesting notification permission...');
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        console.log('⚠️ Notification permission not granted - skipping FCM token');
        return;
      }
      console.log('✅ Notification permission granted');
      
      // Get FCM token
      console.log('🔄 Fetching FCM token from Firebase...');
      const fcmToken = await getFCMToken();
      
      if (!fcmToken) {
        console.error('❌ FCM token not available (emulator detected, needs physical device)');
        return;
      }
      
      console.log('✅ FCM Token obtained successfully');
      console.log('📤 Sending FCM token to backend API...');
      
      // Send token to backend
      const result = await userAPI.registerFCMToken(phone, fcmToken);
      console.log('✅ Backend response:', result);
      console.log('✅ FCM token registered successfully - rider will receive notifications!');
    } catch (error: any) {
      console.error('❌ Failed to register FCM token:', error);
      console.error('❌ Error details:', error.message);
      // Don't throw - notification registration failure shouldn't block login
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Phone size={40} color="#3B82F6" />
            </View>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>Enter your registered mobile number</Text>
          </View>

          {!confirm ? (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={styles.phoneInput}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                onPress={handleSendOTP}
                disabled={isLoading}
                activeOpacity={0.8}
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
                  style={styles.input}
                  placeholder="123456"
                  value={otp}
                  onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
                onPress={handleVerifyOTP}
                disabled={isLoading}
                activeOpacity={0.8}
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

      <AlertComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRightWidth: 1,
    borderRightColor: '#D1D5DB',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
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
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  signupLink: {
    alignItems: 'center',
    marginTop: 32,
  },
  signupLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signupLinkBold: {
    color: '#3B82F6',
    fontWeight: '700',
  },
});
