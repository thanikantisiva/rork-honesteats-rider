/**
 * Verification Pending Screen
 * Shown while ops team reviews rider documents
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Clock, RefreshCw, Phone } from 'lucide-react-native';
import { useThemedAlert } from '@/components/ThemedAlert';
import { riderAuthAPI } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VerificationPendingScreen() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useThemedAlert();
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const phone = await AsyncStorage.getItem('@rider_phone');
      if (!phone) {
        showAlert('Error', 'Phone number not found. Please signup again.', undefined, 'error');
        router.replace('/welcome');
        return;
      }

      const response = await riderAuthAPI.checkLogin(phone);

      if (response.status === 'APPROVED') {
        showAlert(
          'Approved!',
          'Your application has been approved. You can now login.',
          [
            {
              text: 'Login Now',
              style: 'default',
              onPress: () => router.replace('/login'),
            },
          ],
          'success'
        );
      } else if (response.status === 'REJECTED') {
        showAlert(
          'Application Rejected',
          response.message || 'Your application was rejected. Please contact support.',
          [
            {
              text: 'OK',
              style: 'default',
              onPress: () => router.replace('/welcome'),
            },
          ],
          'error'
        );
      } else {
        showAlert(
          'Still Under Review',
          'Your application is still being reviewed. Please check back later.',
          undefined,
          'info'
        );
      }
    } catch (error: any) {
      console.error('Check status error:', error);
      showAlert('Error', 'Failed to check status. Please try again.', undefined, 'error');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Clock size={64} color="#F59E0B" strokeWidth={2} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Application Under Review</Text>

          {/* Message */}
          <Text style={styles.message}>
            We're verifying your documents. This usually takes 24-48 hours. We'll notify you once approved.
          </Text>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>1.</Text>
              <Text style={styles.infoText}>Our team reviews your documents</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>2.</Text>
              <Text style={styles.infoText}>You'll receive a notification</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>3.</Text>
              <Text style={styles.infoText}>Login and start delivering!</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.checkButton}
            onPress={checkStatus}
            disabled={isChecking}
            activeOpacity={0.8}
          >
            {isChecking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <RefreshCw size={20} color="#FFFFFF" />
                <Text style={styles.checkButtonText}>Check Status</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => {
              showAlert(
                'Need Help?',
                'Contact our support team at support@honesteats.com or call +91-1234567890',
                undefined,
                'info'
              );
            }}
            activeOpacity={0.8}
          >
            <Phone size={20} color="#3B82F6" />
            <Text style={styles.supportButtonText}>Need Help?</Text>
          </TouchableOpacity>
        </View>
      </View>

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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  infoBullet: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
    width: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    gap: 12,
  },
  checkButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  supportButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
});
