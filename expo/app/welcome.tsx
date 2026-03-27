/**
 * Welcome Screen
 * Modern landing page with Login/Signup options
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { LogIn, UserPlus, Bike, Wallet, Clock, TrendingUp } from 'lucide-react-native';
import { YumDudeLogo } from '@/components/YumDudeLogo';
import { riderTheme } from '@/theme/riderTheme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Hero Section */}
        <View style={styles.content}>
          <View style={styles.heroSection}>
            {/* Logo with Glow Effect */}
            <View style={styles.logoBg}>
              <View style={styles.glowCircle} />
              <View style={styles.logoWrapper}>
                <YumDudeLogo size={100} />
              </View>
            </View>
            
            {/* Brand Name & Tagline */}
            <Text style={styles.brandName}>YumDude</Text>
            <Text style={styles.subtitle}>Delivery Dude Platform</Text>
            <Text style={styles.description}>
              Join our delivery network and earn on your schedule
            </Text>
          </View>

          {/* Feature Cards */}
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: riderTheme.colors.successSoft }]}>
                <Wallet size={24} color={riderTheme.colors.success} strokeWidth={2.5} />
              </View>
              <Text style={styles.featureTitle}>Daily Payouts</Text>
              <Text style={styles.featureDesc}>Fast & reliable earnings</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: riderTheme.colors.primarySoft }]}>
                <Bike size={24} color={riderTheme.colors.primary} strokeWidth={2.5} />
              </View>
              <Text style={styles.featureTitle}>Smart Routes</Text>
              <Text style={styles.featureDesc}>Nearby order assignments</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: riderTheme.colors.accentSoft }]}>
                <Clock size={24} color={riderTheme.colors.accent} strokeWidth={2.5} />
              </View>
              <Text style={styles.featureTitle}>Flexible Hours</Text>
              <Text style={styles.featureDesc}>Work when you want</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: riderTheme.colors.infoSoft }]}>
                <TrendingUp size={24} color={riderTheme.colors.info} strokeWidth={2.5} />
              </View>
              <Text style={styles.featureTitle}>Grow Income</Text>
              <Text style={styles.featureDesc}>More deliveries, more pay</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/signup')}
            activeOpacity={0.85}
          >
            <View style={styles.buttonIconWrap}>
              <UserPlus size={20} color={riderTheme.colors.textInverse} strokeWidth={2.5} />
            </View>
            <Text style={styles.primaryButtonText}>Start Earning Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/login')}
            activeOpacity={0.85}
          >
            <LogIn size={18} color={riderTheme.colors.primary} strokeWidth={2.5} />
            <Text style={styles.secondaryButtonText}>Login to Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  logoBg: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  glowCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: riderTheme.colors.primarySoft,
    opacity: 0.5,
  },
  logoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: riderTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...riderTheme.shadow.large,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: riderTheme.colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 16,
  },
  featureCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
    ...riderTheme.shadow.medium,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: riderTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: riderTheme.colors.textSecondary,
    lineHeight: 17,
  },
  footer: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: riderTheme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: riderTheme.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...riderTheme.shadow.medium,
  },
  buttonIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: riderTheme.colors.textInverse,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: riderTheme.colors.surface,
    borderWidth: 1.5,
    borderColor: riderTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: riderTheme.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: riderTheme.colors.primary,
    letterSpacing: 0.2,
  },
});
