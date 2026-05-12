export const riderTheme = {
  colors: {
    // YumDude Brand — Warm Cream × Signature Red × Golden Yellow
    background: '#FFFDF7',           // Warm cream (matches customer & restaurant apps)
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#F8F3EF',         // Warm muted cream
    border: '#E8DDD8',
    borderLight: '#F1EAE6',

    // Text — warm dark browns
    textPrimary: '#1A0C08',
    textSecondary: '#5C3D2E',
    textMuted: '#9E7A6A',
    textInverse: '#FFFFFF',

    // YumDude Red — primary brand
    primary: '#E8352A',
    primaryDark: '#C42820',
    primaryLight: '#FF5048',
    primarySoft: '#FCECEA',
    primaryGradientStart: '#E8352A',
    primaryGradientEnd: '#FF5048',

    // YumDude Yellow — accent / highlight
    accent: '#FFC52E',
    accentDark: '#E6A800',
    accentSoft: '#FFF8E0',

    // Status Colors
    success: '#22C55E',
    successSoft: '#DCFCE7',
    successDark: '#16A34A',

    warning: '#F59E0B',
    warningSoft: '#FEF3C7',
    warningDark: '#D97706',

    danger: '#EF4444',
    dangerSoft: '#FEE2E2',
    dangerDark: '#DC2626',

    info: '#3B82F6',
    infoSoft: '#DBEAFE',
    infoDark: '#2563EB',

    // Special
    overlay: 'rgba(26, 12, 8, 0.55)',
    overlayLight: 'rgba(26, 12, 8, 0.25)',
    overlayDark: 'rgba(26, 12, 8, 0.80)',

    // Gradients (reference values — implemented with stacked views)
    gradientPrimary: ['#E8352A', '#FF5048'] as string[],
    gradientAccent: ['#FFC52E', '#FFD970'] as string[],
    gradientSuccess: ['#22C55E', '#4ADE80'] as string[],
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },
  radius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 999,
  },
  typography: {
    h1: 30,
    h2: 24,
    h3: 20,
    h4: 18,
    h5: 16,
    body: 14,
    bodySmall: 12,
    caption: 11,
    tiny: 9,
  },
  fontWeight: {
    regular: '400' as any,
    medium: '500' as any,
    semibold: '600' as any,
    bold: '700' as any,
    extrabold: '800' as any,
    black: '900' as any,
  },
  shadow: {
    small: {
      shadowColor: '#1A0C08',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#1A0C08',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    large: {
      shadowColor: '#1A0C08',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 8,
    },
    card: {
      shadowColor: '#1A0C08',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    primary: {
      shadowColor: '#E8352A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    soft: {
      shadowColor: '#1A0C08',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
  },
};

export type RiderTheme = typeof riderTheme;
