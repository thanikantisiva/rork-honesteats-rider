/**
 * Verification Pending Screen
 * Shown while ops team reviews rider documents
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Clock3, RefreshCw, PhoneCall, BadgeCheck } from 'lucide-react-native';
import { useThemedAlert } from '@/components/ThemedAlert';
import { riderAuthAPI } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { riderTheme } from '@/theme/riderTheme';

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
      showAlert('Error', 'Failed to check status. Please try again.', undefined, 'error');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.iconWrap}>
              <Clock3 size={52} color={riderTheme.colors.warning} strokeWidth={2} />
            </View>
            <Text style={styles.title}>Verification In Progress</Text>
            <Text style={styles.message}>
              We are reviewing your documents. Approval usually takes 24-48 hours.
            </Text>
            <View style={styles.statusPill}>
              <BadgeCheck size={14} color={riderTheme.colors.info} />
              <Text style={styles.statusPillText}>Profile under quality check</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What happens next</Text>
            <Text style={styles.infoLine}>1. Document review by operations team</Text>
            <Text style={styles.infoLine}>2. Approval notification sent to your phone</Text>
            <Text style={styles.infoLine}>3. Login and start delivery shifts</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.checkButton}
            onPress={checkStatus}
            disabled={isChecking}
            activeOpacity={0.88}
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
            activeOpacity={0.88}
          >
            <PhoneCall size={18} color={riderTheme.colors.primary} />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  heroCard: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.xl,
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
    padding: 24,
    alignItems: 'center',
    ...riderTheme.shadow.card,
  },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: riderTheme.colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  statusPill: {
    marginTop: 14,
    backgroundColor: riderTheme.colors.infoSoft,
    borderRadius: riderTheme.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusPillText: {
    color: riderTheme.colors.info,
    fontWeight: '600',
    fontSize: 12,
  },
  infoCard: {
    marginTop: 14,
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
    marginBottom: 10,
  },
  infoLine: {
    fontSize: 14,
    color: riderTheme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    gap: 10,
  },
  checkButton: {
    backgroundColor: riderTheme.colors.primary,
    paddingVertical: 15,
    borderRadius: riderTheme.radius.md,
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
    backgroundColor: riderTheme.colors.surface,
    paddingVertical: 15,
    borderRadius: riderTheme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
  },
  supportButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: riderTheme.colors.primary,
  },
});
