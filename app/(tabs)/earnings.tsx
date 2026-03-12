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
import { IndianRupee, TrendingUp, Package, Clock, Calendar, CheckCircle2, ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { riderEarningsAPI } from '@/lib/api';
import { EarningsSummary } from '@/types';
import { riderTheme } from '@/theme/riderTheme';

type Period = 'today' | 'week' | 'month';
type BreakdownTab = 'unsettled' | 'settled';

const FILTER_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
];

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const { rider } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [selectedBreakdownTab, setSelectedBreakdownTab] = useState<BreakdownTab>('unsettled');
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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

  const selectedFilterLabel =
    FILTER_OPTIONS.find((option) => option.value === selectedPeriod)?.label || 'Today';

  const getDisplayDate = (value?: string) => (value ? value.split('#')[0] : '');
  const getDisplayOrderId = (value?: string, orderId?: string | null) =>
    orderId || (value?.includes('#') ? value.split('#')[1] : '');
  const unsettledBreakdown = earnings?.dailyBreakdown?.filter((day) => !day.settled) || [];
  const settledBreakdown = earnings?.dailyBreakdown?.filter((day) => day.settled) || [];
  const visibleBreakdown =
    selectedBreakdownTab === 'unsettled' ? unsettledBreakdown : settledBreakdown;

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

        {/* Filter */}
        <View style={styles.periodContainer}>
          <Text style={styles.filterLabel}>Filter by time</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setIsFilterOpen((prev) => !prev)}
            activeOpacity={0.85}
          >
            <Text style={styles.filterButtonText}>{selectedFilterLabel}</Text>
            <ChevronDown
              size={18}
              color={riderTheme.colors.textSecondary}
              strokeWidth={2.5}
              style={[styles.filterChevron, isFilterOpen && styles.filterChevronOpen]}
            />
          </TouchableOpacity>

          {isFilterOpen && (
            <View style={styles.filterDropdown}>
              {FILTER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    selectedPeriod === option.value && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedPeriod(option.value);
                    setIsFilterOpen(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedPeriod === option.value && styles.filterOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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

                  <View style={styles.breakdownTabs}>
                    <TouchableOpacity
                      style={[
                        styles.breakdownTab,
                        selectedBreakdownTab === 'unsettled' && styles.breakdownTabActive,
                      ]}
                      onPress={() => setSelectedBreakdownTab('unsettled')}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.breakdownTabText,
                          selectedBreakdownTab === 'unsettled' && styles.breakdownTabTextActive,
                        ]}
                      >
                        Unsettled ({unsettledBreakdown.length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.breakdownTab,
                        selectedBreakdownTab === 'settled' && styles.breakdownTabActive,
                      ]}
                      onPress={() => setSelectedBreakdownTab('settled')}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.breakdownTabText,
                          selectedBreakdownTab === 'settled' && styles.breakdownTabTextActive,
                        ]}
                      >
                        Settled ({settledBreakdown.length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {visibleBreakdown.length === 0 ? (
                    <View style={styles.breakdownEmptyState}>
                      <Text style={styles.breakdownEmptyText}>
                        No {selectedBreakdownTab} earnings for this period.
                      </Text>
                    </View>
                  ) : visibleBreakdown.map((day, index) => (
                    <View key={index} style={styles.dayCard}>
                      <View style={styles.dayHeader}>
                        <Text style={styles.dayOrderId}>
                          {getDisplayOrderId(day.date, day.orderId) || 'Delivery'}
                        </Text>
                        <Text style={styles.dayAmount}>₹{(day.totalEarnings || 0).toFixed(2)}</Text>
                      </View>
                      <View style={styles.dayMetrics}>
                        <View style={styles.dayMetric}>
                          <Package size={14} color={riderTheme.colors.textMuted} strokeWidth={2} />
                          <View style={styles.dayMetricContent}>
                            <Text style={styles.dayMetricText}>{day.totalDeliveries || 0} deliveries</Text>
                            <Text style={styles.dayDate}>{getDisplayDate(day.date)}</Text>
                          </View>
                        </View>
                        <View style={styles.dayMetric}>
                          <Clock size={14} color={riderTheme.colors.textMuted} strokeWidth={2} />
                          <Text style={styles.dayMetricText}>{day.onlineTimeMinutes || 0} min</Text>
                        </View>
                      </View>
                      {day.settled && (
                        <View style={styles.settlementCard}>
                          <View style={styles.settlementHeader}>
                            <CheckCircle2 size={16} color={riderTheme.colors.success} strokeWidth={2.5} />
                            <Text style={styles.settlementTitle}>Settlement completed</Text>
                          </View>
                          {day.settlementId ? (
                            <Text style={styles.settlementText}>Settlement ID: {day.settlementId}</Text>
                          ) : null}
                          {day.settledAt ? (
                            <Text style={styles.settlementText}>Settled At: {day.settledAt}</Text>
                          ) : null}
                        </View>
                      )}
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
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: riderTheme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRadius: riderTheme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  filterChevron: {
    transform: [{ rotate: '0deg' }],
  },
  filterChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  filterDropdown: {
    marginTop: 8,
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.lg,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
    overflow: 'hidden',
    ...riderTheme.shadow.small,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: riderTheme.colors.borderLight,
  },
  filterOptionActive: {
    backgroundColor: riderTheme.colors.successSoft,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  filterOptionTextActive: {
    color: riderTheme.colors.success,
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
  breakdownTabs: {
    flexDirection: 'row',
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRadius: riderTheme.radius.lg,
    padding: 4,
    gap: 4,
    marginBottom: 14,
  },
  breakdownTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: riderTheme.radius.md,
  },
  breakdownTabActive: {
    backgroundColor: riderTheme.colors.primary,
    ...riderTheme.shadow.small,
  },
  breakdownTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: riderTheme.colors.textSecondary,
  },
  breakdownTabTextActive: {
    color: riderTheme.colors.textInverse,
  },
  breakdownEmptyState: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.lg,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
  },
  breakdownEmptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
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
    alignItems: 'flex-start',
    gap: 6,
  },
  dayMetricContent: {
    gap: 2,
  },
  dayMetricText: {
    fontSize: 12,
    fontWeight: '600',
    color: riderTheme.colors.textSecondary,
  },
  dayOrderId: {
    fontSize: 10,
    fontWeight: '400',
    color: riderTheme.colors.textMuted,
  },
  dayDate: {
    fontSize: 10,
    fontWeight: '400',
    color: riderTheme.colors.textMuted,
  },
  settlementCard: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: riderTheme.colors.borderLight,
    gap: 4,
  },
  settlementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settlementTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.success,
  },
  settlementText: {
    fontSize: 12,
    fontWeight: '500',
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
