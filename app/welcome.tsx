/**
 * Welcome Screen
 * Bold YumDude red hero + cream feature section
 */

import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Svg, Path } from 'react-native-svg';
import { Bike, Wallet, Clock, TrendingUp, ArrowRight } from 'lucide-react-native';
import { YumDudeLogo } from '@/components/YumDudeLogo';
import { riderTheme } from '@/theme/riderTheme';

const { width: SCREEN_W } = Dimensions.get('window');

const FEATURES = [
  { icon: Wallet, label: 'Daily Payouts', desc: 'Fast, reliable earnings', bg: riderTheme.colors.successSoft, color: riderTheme.colors.successDark },
  { icon: Bike, label: 'Smart Routes', desc: 'Nearby assignments first', bg: riderTheme.colors.primarySoft, color: riderTheme.colors.primaryDark },
  { icon: Clock, label: 'Flexible Hours', desc: 'Work on your schedule', bg: riderTheme.colors.accentSoft, color: riderTheme.colors.accentDark },
  { icon: TrendingUp, label: 'Grow Income', desc: 'More rides, more pay', bg: riderTheme.colors.infoSoft, color: riderTheme.colors.infoDark },
];

export default function WelcomeScreen() {
  const router = useRouter();

  // Entrance animations
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(-30)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const titleY = useRef(new Animated.Value(20)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const cardsY = useRef(new Animated.Value(40)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const ctaY = useRef(new Animated.Value(30)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(logoY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(cardsY, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(ctaY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* ── DARK HERO ─────────────────────────────────────── */}
        <Animated.View style={[styles.hero, { opacity: heroOpacity }]}>
          {/* Decorative circles */}
          <View style={styles.decCircle} />
          <View style={styles.decCircle2} />

          {/* Logo */}
          <Animated.View
            style={[
              styles.logoWrap,
              { transform: [{ scale: logoScale }, { translateY: logoY }] },
            ]}
          >
            <YumDudeLogo size={90} color="#FFFFFF" accent="#FFC52E" />
          </Animated.View>

          {/* Brand copy */}
          <Animated.View
            style={{ transform: [{ translateY: titleY }], opacity: titleOpacity }}
          >
            <Text style={styles.heroTitle}>YumDude</Text>
            <View style={styles.heroAccentRow}>
              <View style={styles.heroStripe} />
              <Text style={styles.heroTagline}>RIDER PLATFORM</Text>
              <View style={styles.heroStripe} />
            </View>
            <Text style={styles.heroDesc}>Deliver. Earn. Own your day.</Text>
          </Animated.View>
        </Animated.View>

        {/* Wave separator (SVG) */}
        <View style={styles.waveContainer}>
          <Svg
            width={SCREEN_W}
            height={48}
            viewBox={`0 0 ${SCREEN_W} 48`}
            style={styles.wave}
          >
            <Path
              d={`M0,0 C${SCREEN_W * 0.25},48 ${SCREEN_W * 0.75},0 ${SCREEN_W},48 L${SCREEN_W},0 L0,0 Z`}
              fill="#1A0C08"
            />
          </Svg>
        </View>

        {/* ── CREAM SECTION ────────────────────────────────── */}
        <View style={styles.creamSection}>
          {/* Feature grid */}
          <Animated.View
            style={[
              styles.featuresGrid,
              { opacity: cardsOpacity, transform: [{ translateY: cardsY }] },
            ]}
          >
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <View key={i} style={styles.featureCard}>
                  <View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}>
                    <Icon size={22} color={f.color} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              );
            })}
          </Animated.View>

          {/* CTAs */}
          <Animated.View
            style={[
              styles.ctaSection,
              { opacity: ctaOpacity, transform: [{ translateY: ctaY }] },
            ]}
          >
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/signup')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>Start Earning Today</Text>
              <View style={styles.primaryBtnArrow}>
                <ArrowRight size={18} color="#E8352A" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/login')}
              activeOpacity={0.88}
            >
              <Text style={styles.secondaryBtnText}>Already a rider? Log in</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },

  // ── Hero ──
  hero: {
    backgroundColor: '#1A0C08',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 0,
    alignItems: 'center',
    overflow: 'hidden',
  },
  decCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(232, 53, 42, 0.2)',
  },
  decCircle2: {
    position: 'absolute',
    bottom: 10,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 197, 46, 0.08)',
  },
  logoWrap: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 197, 46, 0.45)',
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroAccentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  heroStripe: {
    width: 24,
    height: 3,
    backgroundColor: '#FFC52E',
    borderRadius: 999,
  },
  heroTagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFC52E',
    letterSpacing: 3,
  },
  heroDesc: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
    marginBottom: 20,
  },

  // ── Wave ──
  waveContainer: {
    backgroundColor: '#FFFDF7',
    marginTop: -1,
  },
  wave: {
    display: 'flex',
  },

  // ── Cream section ──
  creamSection: {
    flex: 1,
    backgroundColor: '#FFFDF7',
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 4,
  },
  featureCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
    shadowColor: '#1A0C08',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
    lineHeight: 16,
  },

  // ── CTAs ──
  ctaSection: {
    gap: 10,
    paddingTop: 8,
  },
  primaryBtn: {
    backgroundColor: '#E8352A',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#E8352A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'center',
  },
  primaryBtnArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFC52E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(26, 12, 8, 0.12)',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A0C08',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: riderTheme.colors.textSecondary,
  },
});

