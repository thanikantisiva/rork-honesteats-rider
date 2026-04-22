/**
 * Account/Profile Screen
 * Modern rider profile and settings interface
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { User, HelpCircle, LogOut, ChevronRight, Shield, Lock } from 'lucide-react-native';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useThemedAlert } from '@/components/ThemedAlert';
import { YumDudeLogo } from '@/components/YumDudeLogo';
import { riderTheme } from '@/theme/riderTheme';
import { userAPI } from '@/lib/api';

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rider, logout } = useAuth();
  const { goOffline } = useLocation();
  const { activeOrders } = useOrders();
  const { showAlert, AlertComponent } = useThemedAlert();
  const [profile, setProfile] = useState<{ email?: string; dateOfBirth?: string; upiId?: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = React.useCallback(async () => {
    if (!rider?.phone) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const p = await userAPI.getUser(rider.phone, 'RIDER');
      setProfile({ email: p.email, dateOfBirth: p.dateOfBirth, upiId: p.upiId });
    } catch {
      setProfile({});
    } finally {
      setProfileLoading(false);
    }
  }, [rider?.phone]);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleEditProfile = () => {
    router.push('/edit-profile' as any);
  };

  const handleHelpSupport = () => {
    showAlert(
      'Need Help?',
      'Contact our support team at support@honesteats.com or call +91-1234567890',
      undefined,
      'info'
    );
  };

  const handleDataAndPrivacy = () => {
    showAlert(
      'Data and Privacy',
      'YumDude Rider collects your precise location (including in the background while you are online) to assign nearby orders, show routes, and share live ETA. We also use your phone number for sign-in, your camera/photos for document verification, and notifications for order alerts.\n\nYour location and contact details are shared with the assigned restaurant and customer during active deliveries, and with our backend for assignment. We do not sell your data.',
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'View full policy',
          style: 'default',
          onPress: () => {
            Linking.openURL('https://yumdude.com/rider-policy').catch((err) => {
              console.error('Failed to open policy URL:', err);
            });
          },
        },
      ],
      'info',
    );
  };

  const handleLogout = () => {
    if (activeOrders.length > 0) {
      showAlert(
        'Cannot Logout',
        `You have ${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''}. Please complete all deliveries before logging out.`,
        undefined,
        'warning'
      );
      return;
    }

    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout(goOffline);
            router.replace('/welcome');
          },
        },
      ],
      'warning'
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Account</Text>
          <Text style={styles.headerSubtitle}>Manage your profile</Text>
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.logoWrapper}>
              <YumDudeLogo size={56} />
            </View>
            <Text style={styles.profileName}>{rider?.name}</Text>
            <Text style={styles.profileRiderId}>Rider ID: {rider?.riderId}</Text>
            <Text style={styles.profilePhone}>{rider?.phone}</Text>
            {profileLoading ? (
              <ActivityIndicator size="small" color={riderTheme.colors.primary} style={{ marginVertical: 8 }} />
            ) : (
              (profile?.email || profile?.dateOfBirth || profile?.upiId) ? (
                <View style={styles.profileDetails}>
                  {profile?.email ? <Text style={styles.profileDetailLine}>Email: {profile.email}</Text> : null}
                  {profile?.dateOfBirth ? <Text style={styles.profileDetailLine}>DOB: {profile.dateOfBirth}</Text> : null}
                  {profile?.upiId ? <Text style={styles.profileDetailLine}>UPI: {profile.upiId}</Text> : null}
                </View>
              ) : null
            )}
            <View style={styles.verifiedBadge}>
              <Shield size={14} color={riderTheme.colors.success} strokeWidth={2.5} />
              <Text style={styles.verifiedText}>Verified Partner</Text>
            </View>
          </View>

          {/* Menu Section */}
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.85} onPress={handleEditProfile}>
              <View style={[styles.menuIconWrap, { backgroundColor: riderTheme.colors.primarySoft }]}>
                <User size={20} color={riderTheme.colors.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Edit Profile</Text>
                <Text style={styles.menuDesc}>Update your personal information</Text>
              </View>
              <ChevronRight size={20} color={riderTheme.colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.85} onPress={handleDataAndPrivacy}>
              <View style={[styles.menuIconWrap, { backgroundColor: riderTheme.colors.accentSoft }]}>
                <Lock size={20} color={riderTheme.colors.accent} strokeWidth={2.5} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Data and Privacy</Text>
                <Text style={styles.menuDesc}>Review what data we collect and how it's used</Text>
              </View>
              <ChevronRight size={20} color={riderTheme.colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.85} onPress={handleHelpSupport}>
              <View style={[styles.menuIconWrap, { backgroundColor: riderTheme.colors.primarySoft }]}>
                <HelpCircle size={20} color={riderTheme.colors.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Help & Support</Text>
                <Text style={styles.menuDesc}>Get assistance and FAQs</Text>
              </View>
              <ChevronRight size={20} color={riderTheme.colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
            <View style={styles.logoutIconWrap}>
              <LogOut size={20} color={riderTheme.colors.danger} strokeWidth={2.5} />
            </View>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>YumDude Rider v1.0.0</Text>
          </View>
        </ScrollView>
      </View>

      <AlertComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: riderTheme.colors.background,
  },
  header: {
    backgroundColor: riderTheme.colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 20,
    ...riderTheme.shadow.medium,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.xl,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
    ...riderTheme.shadow.large,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: riderTheme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...riderTheme.shadow.medium,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  profileRiderId: {
    fontSize: 12,
    fontWeight: '600',
    color: riderTheme.colors.textMuted,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 13,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
    marginBottom: 8,
  },
  profileDetails: {
    alignSelf: 'stretch',
    marginBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: riderTheme.colors.borderLight,
  },
  profileDetailLine: {
    fontSize: 12,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
    marginTop: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: riderTheme.colors.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: riderTheme.radius.full,
    borderWidth: 1,
    borderColor: riderTheme.colors.success,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: riderTheme.colors.successDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuSection: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.xl,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
    ...riderTheme.shadow.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: riderTheme.colors.borderLight,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: riderTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    gap: 3,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  menuDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: riderTheme.colors.surface,
    borderWidth: 1.5,
    borderColor: riderTheme.colors.danger,
    borderRadius: riderTheme.radius.xl,
    paddingVertical: 15,
    marginBottom: 16,
    ...riderTheme.shadow.small,
  },
  logoutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: riderTheme.colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: riderTheme.colors.danger,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appVersion: {
    fontSize: 12,
    fontWeight: '600',
    color: riderTheme.colors.textMuted,
    letterSpacing: 0.5,
  },
});
