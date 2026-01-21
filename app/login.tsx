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
import { riderAuthAPI } from '@/lib/api';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useThemedAlert();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirm, setConfirm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!phone || phone.length !== 10) {
      showAlert('Invalid Phone', 'Please enter a valid 10-digit mobile number', undefined, 'warning');
      return;
    }

    setIsLoading(true);
    try {
      // Check if rider can login
      const statusResponse = await riderAuthAPI.checkLogin(phone);

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
        await AsyncStorage.setItem('@rider_phone', phone);
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
      const confirmation = await auth().signInWithPhoneNumber(`+91${phone}`);
      setConfirm(confirmation);
      
      // Store rider info
      await AsyncStorage.setItem('@rider_phone', phone);
      await AsyncStorage.setItem('@rider_id', statusResponse.riderId!);
      await AsyncStorage.setItem('@rider_name', statusResponse.name!);

      showAlert('OTP Sent', 'Please enter the 6-digit OTP sent to your phone', undefined, 'success');
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

    setIsLoading(true);
    try {
      await confirm.confirm(otp);
      
      // Mark as logged in
      await AsyncStorage.setItem('@rider_logged_in', 'true');

      showAlert(
        'Login Successful',
        'Welcome to HonestEats Rider!',
        [
          {
            text: 'Start',
            style: 'default',
            onPress: () => router.replace('/(tabs)'),
          },
        ],
        'success'
      );
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      showAlert('Invalid OTP', 'The OTP you entered is incorrect. Please try again.', undefined, 'error');
    } finally {
      setIsLoading(false);
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
                  placeholder="6-digit OTP"
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
