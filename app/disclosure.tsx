/**
 * Prominent Disclosure & Consent Screen
 *
 * Google Play policy compliance:
 *  - Shown in-app during normal usage (not in settings/menu)
 *  - Describes what personal/sensitive data is collected and why
 *  - Immediately precedes any runtime permission request (location etc.)
 *  - Requires affirmative user action (tap "I Agree and Continue")
 *  - Navigating away does NOT count as consent: back button is intercepted,
 *    and the only way forward is the explicit button
 *  - Not a replacement for the privacy policy, just links to it
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  MapPin,
  Phone,
  Camera,
  Bell,
  Share2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { useThemedAlert } from '@/components/ThemedAlert';
import { riderTheme } from '@/theme/riderTheme';

const POLICY_URL = 'https://yumdude.com/rider-policy';

type Section = {
  icon: React.ComponentType<any>;
  title: string;
  body: string;
};

const DATA_SECTIONS: Section[] = [
  {
    icon: MapPin,
    title: 'Location (precise, including background)',
    body:
      'YumDude Rider collects your precise location to match you with nearby orders, show pickup and drop-off routes, share live ETA with customers and restaurants, and track deliveries — even when the app is in the background, closed, or the screen is locked. Background tracking only runs while you are online; it stops the moment you go offline or log out.',
  },
  {
    icon: Phone,
    title: 'Phone number',
    body:
      'Used to create your rider account, verify your identity via OTP, and contact you about active deliveries.',
  },
  {
    icon: Camera,
    title: 'Camera and photos',
    body:
      'Used only when you upload verification documents (license, Aadhaar, vehicle papers) and when capturing delivery proof during pickup.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    body:
      'Used to alert you about new order offers, pickup reminders, and delivery status updates.',
  },
];

export default function DisclosureScreen() {
  const router = useRouter();
  const { acceptDisclosure, logout, isLoggedIn } = useAuth();
  const { goOffline } = useLocation();
  const { showAlert, AlertComponent } = useThemedAlert();
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [isDeclining, setIsDeclining] = React.useState(false);

  // Block hardware back button — navigating away must not count as consent.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // If somehow we land here while logged out, bounce to welcome.
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/welcome');
    }
  }, [isLoggedIn, router]);

  const handleAccept = async () => {
    if (isAccepting) return;
    setIsAccepting(true);
    try {
      await acceptDisclosure();
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Failed to persist disclosure consent:', err);
      showAlert(
        'Could not save',
        'We could not save your consent. Please try again.',
        undefined,
        'error',
      );
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    if (isDeclining) return;
    showAlert(
      'Decline and log out?',
      'YumDude Rider needs these permissions to assign and track deliveries. If you decline, you will be logged out and cannot accept orders.',
      [
        { text: 'Go back', style: 'cancel' },
        {
          text: 'Decline and log out',
          style: 'destructive',
          onPress: async () => {
            setIsDeclining(true);
            try {
              await logout(goOffline);
              router.replace('/welcome');
            } catch (err) {
              console.error('Logout from disclosure failed:', err);
            } finally {
              setIsDeclining(false);
            }
          },
        },
      ],
      'warning',
    );
  };

  const openPolicy = () => {
    Linking.openURL(POLICY_URL).catch((err) => {
      console.error('Failed to open policy URL:', err);
      showAlert(
        'Could not open link',
        `Please visit ${POLICY_URL} in your browser.`,
        undefined,
        'error',
      );
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroIconWrap}>
            <ShieldCheck size={36} color={riderTheme.colors.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>Before you start delivering</Text>
          <Text style={styles.subtitle}>
            YumDude Rider needs to collect a few types of data so you can receive
            and complete deliveries. Please review how your data is used before
            continuing.
          </Text>

          <View style={styles.sectionsCard}>
            {DATA_SECTIONS.map((section, idx) => {
              const Icon = section.icon;
              const isLast = idx === DATA_SECTIONS.length - 1;
              return (
                <View
                  key={section.title}
                  style={[styles.sectionRow, isLast && styles.sectionRowLast]}
                >
                  <View style={styles.sectionIconWrap}>
                    <Icon size={20} color={riderTheme.colors.primary} strokeWidth={2.5} />
                  </View>
                  <View style={styles.sectionBody}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionText}>{section.body}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.sharingCard}>
            <View style={styles.sharingHeader}>
              <Share2 size={18} color={riderTheme.colors.accent} strokeWidth={2.5} />
              <Text style={styles.sharingTitle}>How your data is shared</Text>
            </View>
            <Text style={styles.sharingText}>
              Your location and contact details are shared with the assigned
              restaurant and customer during an active delivery, and with our
              backend (Amazon Web Services) for order assignment and support.
              We do not sell your data and do not use it for advertising.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.policyLink}
            onPress={openPolicy}
            activeOpacity={0.7}
          >
            <Text style={styles.policyLinkText}>Read the full Rider Privacy Policy</Text>
            <ExternalLink size={14} color={riderTheme.colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            By tapping "I Agree and Continue" you confirm that you have read and
            understood how YumDude Rider accesses, collects, uses, and shares the
            data above, and you give consent for us to do so. You can withdraw
            consent at any time by logging out or uninstalling the app.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, isAccepting && styles.buttonDisabled]}
            onPress={handleAccept}
            disabled={isAccepting || isDeclining}
            activeOpacity={0.85}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color={riderTheme.colors.textInverse} />
            ) : (
              <Text style={styles.primaryButtonText}>I Agree and Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
            disabled={isAccepting || isDeclining}
            activeOpacity={0.7}
          >
            <Text style={styles.declineButtonText}>
              {isDeclining ? 'Logging out...' : 'Decline and log out'}
            </Text>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroIconWrap: {
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: riderTheme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...riderTheme.shadow.small,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  sectionsCard: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.xl,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
    ...riderTheme.shadow.card,
  },
  sectionRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: riderTheme.colors.borderLight,
  },
  sectionRowLast: {
    borderBottomWidth: 0,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: riderTheme.radius.md,
    backgroundColor: riderTheme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionBody: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  sectionText: {
    fontSize: 12,
    lineHeight: 19,
    color: riderTheme.colors.textSecondary,
  },
  sharingCard: {
    marginTop: 14,
    backgroundColor: riderTheme.colors.accentSoft,
    borderRadius: riderTheme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: riderTheme.colors.accent,
  },
  sharingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sharingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.accentDark,
    letterSpacing: 0.2,
  },
  sharingText: {
    fontSize: 12,
    lineHeight: 19,
    color: riderTheme.colors.textPrimary,
  },
  policyLink: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  policyLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.primary,
    letterSpacing: 0.2,
  },
  footerNote: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 17,
    color: riderTheme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: riderTheme.colors.borderLight,
    backgroundColor: riderTheme.colors.surface,
  },
  primaryButton: {
    backgroundColor: riderTheme.colors.primary,
    paddingVertical: 15,
    borderRadius: riderTheme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...riderTheme.shadow.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: riderTheme.colors.textInverse,
    letterSpacing: 0.3,
  },
  declineButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: riderTheme.colors.textMuted,
    letterSpacing: 0.2,
  },
});
