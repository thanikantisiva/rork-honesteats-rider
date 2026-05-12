import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { YumDudeLogo } from './YumDudeLogo';
import { riderTheme } from '@/theme/riderTheme';

interface StartupSplashProps {
  onDone: () => void;
}

export function StartupSplash({ onDone }: StartupSplashProps) {
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Red hero section scale-in
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;

  // Logo entrance
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(20)).current;

  // Glow ring
  const glowScale = useRef(new Animated.Value(0.6)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Brand name
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(16)).current;
  const textScale = useRef(new Animated.Value(0.9)).current;

  // Tagline
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(10)).current;

  // Yellow accent strip
  const accentOpacity = useRef(new Animated.Value(0)).current;
  const accentScaleX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Hero section appears
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(heroScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]),

      // 2. Logo bursts in
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
        Animated.timing(logoY, { toValue: 0, duration: 350, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      ]),

      // 3. Glow ring expands
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 350, useNativeDriver: true }),
        Animated.spring(glowScale, { toValue: 1.4, friction: 4, tension: 30, useNativeDriver: true }),
      ]),

      // 4. Brand name slides up
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(textY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(textScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),

      // 5. Yellow accent stripe sweeps in
      Animated.parallel([
        Animated.timing(accentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(accentScaleX, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),

      // 6. Tagline
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(taglineY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),

      Animated.delay(600),

      // 7. Fade out
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 380,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(onDone);
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity: containerOpacity }]}>
      {/* Red hero panel */}
      <Animated.View
        style={[styles.heroBg, { opacity: heroOpacity, transform: [{ scale: heroScale }] }]}
      />

      <View style={styles.centerWrap}>
        {/* Glow ring behind logo */}
        <Animated.View
          style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
        />

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: logoOpacity, transform: [{ scale: logoScale }, { translateY: logoY }] },
          ]}
        >
          <YumDudeLogo size={100} color="#FFFFFF" accent="#FFC52E" />
        </Animated.View>

        {/* YumDude brand name */}
        <Animated.Text
          style={[
            styles.brandName,
            { opacity: textOpacity, transform: [{ translateY: textY }, { scale: textScale }] },
          ]}
        >
          YumDude
        </Animated.Text>

        {/* Yellow separator stripe */}
        <Animated.View
          style={[
            styles.accentStripe,
            { opacity: accentOpacity, transform: [{ scaleX: accentScaleX }] },
          ]}
        />

        {/* Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            { opacity: taglineOpacity, transform: [{ translateY: taglineY }] },
          ]}
        >
          RIDER PLATFORM
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E8352A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E8352A',
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 197, 46, 0.25)',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  brandName: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 10,
  },
  accentStripe: {
    width: 60,
    height: 4,
    backgroundColor: '#FFC52E',
    borderRadius: 2,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});

