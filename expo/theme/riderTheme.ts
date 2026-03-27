export const riderTheme = {
  colors: {
    // Vibrant Orange & Purple - Premium Food Theme
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#FEFEFE',
    surfaceMuted: '#F8F9FA',
    border: '#E9ECEF',
    borderLight: '#F1F3F5',
    
    // Text
    textPrimary: '#2D1B0E',
    textSecondary: '#6B4423',
    textMuted: '#A67C52',
    textInverse: '#FFFFFF',
    
    // Brand Colors
    primary: '#FF6B35',        // Electric Orange
    primaryDark: '#E85A28',
    primaryLight: '#FF8254',
    primarySoft: '#FFE8DF',
    primaryGradientStart: '#FF6B35',
    primaryGradientEnd: '#FF8254',
    
    // Accent
    accent: '#8B5CF6',         // Royal Purple
    accentDark: '#7C3AED',
    accentSoft: '#EDE9FE',
    
    // Status Colors
    success: '#10B981',        // Emerald
    successSoft: '#D1FAE5',
    successDark: '#059669',
    
    warning: '#FBBF24',        // Bright Amber
    warningSoft: '#FEF3C7',
    warningDark: '#F59E0B',
    
    danger: '#EF4444',         // Red
    dangerSoft: '#FEE2E2',
    dangerDark: '#DC2626',
    
    info: '#8B5CF6',           // Purple
    infoSoft: '#EDE9FE',
    infoDark: '#7C3AED',
    
    // Special
    overlay: 'rgba(15, 23, 42, 0.5)',
    overlayLight: 'rgba(15, 23, 42, 0.25)',
    overlayDark: 'rgba(15, 23, 42, 0.75)',
    
    // Gradients
    gradientPrimary: ['#FF6B35', '#FF8254'],
    gradientAccent: ['#8B5CF6', '#A78BFA'],
    gradientSuccess: ['#10B981', '#34D399'],
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
    h1: 26,
    h2: 22,
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
  },
  shadow: {
    small: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    medium: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    large: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 5,
    },
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    soft: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
  },
};

export type RiderTheme = typeof riderTheme;
