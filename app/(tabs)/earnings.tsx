/**
 * Earnings Screen
 * Modern dashboard showing rider earnings and delivery history
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { IndianRupee, TrendingUp, Package, Clock, Calendar } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { riderEarningsAPI } from '@/lib/api';
import { EarningsSummary } from '@/types';
import { riderTheme } from '@/theme/riderTheme';

type Period = 'today' | 'week' | 'month';

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const { rider } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (rider) {
      fetchEarnings();
    }
  }, [rider, selectedPeriod]);

  const fetchEarnings = async () => {
    if (!rider) return;

    setIsLoading(true);
    try {
      const data = await riderEarningsAPI.getEarnings(rider.riderId, selectedPeriod);
      setEarnings(data);
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={styles.headerTitle}>Earnings</Text>
            <Text style={styles.headerSubtitle}>Track your delivery income</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodContainer}>
          <View style={styles.periodSelector}>
            {(['today', 'week', 'month'] as Period[]).map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
                onPress={() => setSelectedPeriod(period)}
                activeOpacity={0.85}
              >
                <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>
                  {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={fetchEarnings}
              tintColor={riderTheme.colors.primary}
              colors={[riderTheme.colors.primary]}
            />
          }
        >
          {isLoading && !earnings ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={riderTheme.colors.primary} />
              <Text style={styles.loadingText}>Loading earnings...</Text>
            </View>
          ) : earnings ? (
            <>
              {/* Total Earnings Card */}
              <View style={styles.totalCard}>
                <View style={styles.totalHeader}>
                  <View style={styles.totalIconWrap}>
                    <IndianRupee size={22} color={riderTheme.colors.success} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.totalLabel}>Total Earnings</Text>
                </View>
                <Text style={styles.totalAmount}>₹{(earnings.totalEarnings || 0).toFixed(2)}</Text>
                
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <Package size={18} color={riderTheme.colors.primary} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.statValue}>{earnings.totalDeliveries || 0}</Text>
                    <Text style={styles.statLabel}>Deliveries</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <TrendingUp size={18} color={riderTheme.colors.primary} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.statValue}>₹{(earnings.totalTips || 0).toFixed(0)}</Text>
                    <Text style={styles.statLabel}>Tips</Text>
                  </View>
                </View>
              </View>

              {/* Daily Breakdown */}
              {earnings.dailyBreakdown && earnings.dailyBreakdown.length > 0 && (
                <View style={styles.breakdownSection}>
                  <View style={styles.sectionHeader}>
                    <Calendar size={18} color={riderTheme.colors.textSecondary} strokeWidth={2.5} />
                    <Text style={styles.sectionTitle}>Daily Breakdown</Text>
                  </View>
                  
                  {earnings.dailyBreakdown.map((day, index) => (
                    <View key={index} style={styles.dayCard}>
                      <View style={styles.dayHeader}>
                        <Text style={styles.dayDate}>{day.date}</Text>
                        <Text style={styles.dayAmount}>₹{(day.totalEarnings || 0).toFixed(2)}</Text>
                      </View>
                      <View style={styles.dayMetrics}>
                        <View style={styles.dayMetric}>
                          <Package size={14} color={riderTheme.colors.textMuted} strokeWidth={2} />
                          <Text style={styles.dayMetricText}>{day.totalDeliveries || 0} deliveries</Text>
                        </View>
                        <View style={styles.dayMetric}>
                          <Clock size={14} color={riderTheme.colors.textMuted} strokeWidth={2} />
                          <Text style={styles.dayMetricText}>{day.onlineTimeMinutes || 0} min</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <TrendingUp size={52} color={riderTheme.colors.textMuted} strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>No Earnings Yet</Text>
              <Text style={styles.emptyText}>
                Complete deliveries to start earning and see your stats here.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
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
    fontSize: 28,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
  },
  periodContainer: {
    backgroundColor: riderTheme.colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: riderTheme.colors.borderLight,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRadius: riderTheme.radius.lg,
    padding: 4,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: riderTheme.radius.md,
  },
  periodButtonActive: {
    backgroundColor: riderTheme.colors.primary,
    ...riderTheme.shadow.small,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.textSecondary,
  },
  periodTextActive: {
    color: riderTheme.colors.textInverse,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
    marginTop: 16,
  },
  totalCard: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
    ...riderTheme.shadow.medium,
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  totalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: riderTheme.radius.md,
    backgroundColor: riderTheme.colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: riderTheme.colors.textSecondary,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRadius: riderTheme.radius.md,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: riderTheme.radius.sm,
    backgroundColor: riderTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: riderTheme.colors.textSecondary,
  },
  breakdownSection: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  dayCard: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
    ...riderTheme.shadow.small,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayDate: {
    fontSize: 15,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  dayAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: riderTheme.colors.success,
  },
  dayMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  dayMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayMetricText: {
    fontSize: 12,
    fontWeight: '600',
    color: riderTheme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: riderTheme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
