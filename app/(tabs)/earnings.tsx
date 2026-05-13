/**
 * Earnings Screen — Full redesign
 * Dark hero with massive earnings number, compact per-delivery rows below
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { IndianRupee, Package, Clock, TrendingUp, Award, CheckCircle2, Calendar, ChevronLeft, ChevronRight, CalendarRange, Wallet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { riderEarningsAPI } from '@/lib/api';
import { Earnings, EarningsSummary } from '@/types';
import { riderTheme } from '@/theme/riderTheme';

type Mode = 'today' | '7d' | '30d' | 'custom';
type BreakdownTab = 'unsettled' | 'settled' | 'cod';

const SCREEN_W = Dimensions.get('window').width;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBetween(d: Date, start: Date, end: Date) {
  const t = d.getTime();
  return t > start.getTime() && t < end.getTime();
}

function formatDisplay(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function CalendarGrid({
  calMonth, today, rangeStart, rangeEnd, pickingEnd, onDayPress,
}: {
  calMonth: Date; today: Date;
  rangeStart: Date; rangeEnd: Date;
  pickingEnd: boolean;
  onDayPress: (d: Date) => void;
}) {
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun

  // Build week rows
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7).concat(Array(7 - cells.slice(i, i + 7).length).fill(null)));
  }

  return (
    <View>
      {weeks.map((week, wi) => (
        <View key={wi} style={calGridStyles.row}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={calGridStyles.cell} />;
            const isStart = sameDay(day, rangeStart);
            const isEnd = !pickingEnd && sameDay(day, rangeEnd);
            const inRange = !pickingEnd && isBetween(day, rangeStart, rangeEnd);
            const isFuture = day.getTime() > today.getTime();
            const isFirstOfRow = di === 0 || week[di - 1] === null;
            const isLastOfRow = di === 6 || week[di + 1] === null;
            const isRangeStart = inRange && isFirstOfRow;
            const isRangeEnd = inRange && isLastOfRow;

            return (
              <TouchableOpacity
                key={di}
                style={[
                  calGridStyles.cell,
                  inRange && calGridStyles.cellInRange,
                  isRangeStart && calGridStyles.cellInRangeStart,
                  isRangeEnd && calGridStyles.cellInRangeEnd,
                ]}
                onPress={() => !isFuture && onDayPress(day)}
                activeOpacity={isFuture ? 1 : 0.7}
                disabled={isFuture}
              >
                <View style={[
                  calGridStyles.inner,
                  (isStart || isEnd) && calGridStyles.innerSelected,
                  isFuture && calGridStyles.innerFuture,
                ]}>
                  <Text style={[
                    calGridStyles.dayText,
                    (isStart || isEnd) && calGridStyles.dayTextSelected,
                    inRange && !isStart && !isEnd && calGridStyles.dayTextInRange,
                    isFuture && calGridStyles.dayTextFuture,
                  ]}>
                    {day.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const calGridStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 2 },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 1 },
  cellInRange: { backgroundColor: '#FCECEA' },
  cellInRangeStart: { borderTopLeftRadius: 999, borderBottomLeftRadius: 999 },
  cellInRangeEnd: { borderTopRightRadius: 999, borderBottomRightRadius: 999 },
  inner: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  innerSelected: { backgroundColor: '#E8352A' },
  innerFuture: { opacity: 0.3 },
  dayText: { fontSize: 13, fontWeight: '600', color: '#1A0C08' },
  dayTextSelected: { color: '#FFFFFF', fontWeight: '800' },
  dayTextInRange: { color: '#C42820', fontWeight: '700' },
  dayTextFuture: { color: '#9E7A6A' },
});

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const { rider } = useAuth();
  const [mode, setMode] = useState<Mode>('today');
  const [selectedBreakdownTab, setSelectedBreakdownTab] = useState<BreakdownTab>('unsettled');
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // date-range state
  const today = stripTime(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [rangeStart, setRangeStart] = useState<Date>(today);
  const [rangeEnd, setRangeEnd] = useState<Date>(today);
  const [pickingEnd, setPickingEnd] = useState(false); // false=picking start, true=picking end

  const getPresetDates = useCallback((m: Mode): { start: Date; end: Date } => {
    const t = stripTime(new Date());
    if (m === 'today') return { start: t, end: t };
    if (m === '7d') return { start: new Date(t.getFullYear(), t.getMonth(), t.getDate() - 6), end: t };
    if (m === '30d') return { start: new Date(t.getFullYear(), t.getMonth(), t.getDate() - 29), end: t };
    return { start: rangeStart, end: rangeEnd };
  }, [rangeStart, rangeEnd]);

  const fetchEarnings = useCallback(async (m?: Mode, start?: Date, end?: Date) => {
    if (!rider) return;
    const activeMode = m ?? mode;
    setIsLoading(true);
    try {
      if (activeMode === 'custom') {
        const s = start ?? rangeStart;
        const e = end ?? rangeEnd;
        const raw = await riderEarningsAPI.getHistory(rider.riderId, toISO(s), toISO(e));
        // normalize: history API uses `history` key instead of `dailyBreakdown`
        setEarnings({ ...raw, dailyBreakdown: raw.history ?? raw.dailyBreakdown ?? [] });
      } else {
        const periodMap: Record<Mode, 'today' | 'week' | 'month'> = { today: 'today', '7d': 'week', '30d': 'month', custom: 'today' };
        const data = await riderEarningsAPI.getEarnings(rider.riderId, periodMap[activeMode]);
        setEarnings(data);
      }
    } catch (e) {
      console.error('Failed to fetch earnings:', e);
    } finally {
      setIsLoading(false);
    }
  }, [rider, mode, rangeStart, rangeEnd]);

  useEffect(() => {
    if (rider) fetchEarnings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider, mode]);

  const handlePreset = (m: Mode) => {
    setMode(m);
    setShowCalendar(false);
  };

  const handleCalendarDayPress = (day: Date) => {
    if (!pickingEnd) {
      setRangeStart(day);
      setRangeEnd(day);
      setPickingEnd(true);
    } else {
      if (day.getTime() < rangeStart.getTime()) {
        // tapped before start — reset
        setRangeStart(day);
        setRangeEnd(day);
        setPickingEnd(true);
      } else {
        setRangeEnd(day);
        setPickingEnd(false);
      }
    }
  };

  const handleApplyRange = () => {
    setMode('custom');
    setShowCalendar(false);
    fetchEarnings('custom', rangeStart, rangeEnd);
  };

  const prevMonth = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1));
  const nextMonth = () => {
    const next = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
    if (next <= today) setCalMonth(next);
  };

  const rangeLabel = mode === 'custom'
    ? `${formatDisplay(rangeStart)} → ${formatDisplay(rangeEnd)}`
    : mode === 'today' ? 'Today'
    : mode === '7d' ? 'Last 7 Days'
    : 'Last 30 Days';

  const getDisplayDate = (v?: string) => (v ? v.split('#')[0] : '');
  const getDisplayOrderId = (v?: string, orderId?: string | null) =>
    orderId || (v?.includes('#') ? v.split('#')[1] : '');
  const isBonusEntry = (entry: Earnings) => entry.entryType === 'MILESTONE_BONUS';
  const isCodEntry = (entry: Earnings) => entry.entryType === 'COD_AMOUNT_COLLECTED';

  // COD rows live in their own tab; keep them out of the regular earnings tabs.
  const earningRows = earnings?.dailyBreakdown?.filter((d) => !isCodEntry(d)) ?? [];
  const codRows = earnings?.dailyBreakdown?.filter((d) => isCodEntry(d)) ?? [];
  const unsettled = earningRows.filter((d) => !d.settled);
  const settled = earningRows.filter((d) => d.settled);
  const rows =
    selectedBreakdownTab === 'unsettled'
      ? unsettled
      : selectedBreakdownTab === 'settled'
        ? settled
        : codRows;

  const totalCashCollected = earnings?.totalCashCollected ?? 0;

  // Hero total — always computed client-side from non-COD rows so COD cash
  // never inflates the displayed earnings, regardless of whether the
  // backend has been redeployed with the COD-excluding aggregate.
  const displayTotalEarnings = earningRows.reduce(
    (sum, r) => sum + (r.totalEarnings ?? 0),
    0,
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>

        {/* ── DARK HERO ── */}
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.heroLabel}>Total Earnings</Text>
          {isLoading && !earnings ? (
            <ActivityIndicator size="large" color="#FFC52E" style={{ marginVertical: 16 }} />
          ) : (
            <Text style={styles.heroAmount}>
              ₹{displayTotalEarnings.toFixed(2)}
            </Text>
          )}

          {/* Mini stats */}
          <View style={styles.miniStats}>
            <View style={styles.miniStat}>
              <Package size={12} color="rgba(255,255,255,0.5)" strokeWidth={2} />
              <Text style={styles.miniStatVal}>{earnings?.totalDeliveries ?? 0}</Text>
              <Text style={styles.miniStatLbl}>Deliveries</Text>
            </View>
            <View style={styles.miniDivider} />
            <View style={styles.miniStat}>
              <TrendingUp size={12} color="rgba(255,255,255,0.5)" strokeWidth={2} />
              <Text style={styles.miniStatVal}>₹{(earnings?.totalTips ?? 0).toFixed(0)}</Text>
              <Text style={styles.miniStatLbl}>Tips</Text>
            </View>
            <View style={styles.miniDivider} />
            <View style={styles.miniStat}>
              <Award size={12} color="rgba(255,255,255,0.5)" strokeWidth={2} />
              <Text style={styles.miniStatVal}>₹{(earnings?.totalIncentives ?? 0).toFixed(0)}</Text>
              <Text style={styles.miniStatLbl}>Incentives</Text>
            </View>
            <View style={styles.miniDivider} />
            <View style={styles.miniStat}>
              <Award size={12} color="#FFC52E" strokeWidth={2} />
              <Text style={styles.miniStatVal}>₹{(earnings?.totalBonusEarnings ?? 0).toFixed(0)}</Text>
              <Text style={styles.miniStatLbl}>Bonus</Text>
            </View>
            <View style={styles.miniDivider} />
            <View style={styles.miniStat}>
              <Wallet size={12} color="#FFC52E" strokeWidth={2} />
              <Text style={[styles.miniStatVal, styles.miniStatValCod]}>
                ₹{totalCashCollected.toFixed(0)}
              </Text>
              <Text style={styles.miniStatLbl}>COD</Text>
            </View>
          </View>

          {/* Date range row */}
          <View style={styles.periodRow}>
            {(['today', '7d', '30d'] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.periodPill, mode === m && styles.periodPillActive]}
                onPress={() => handlePreset(m)}
                activeOpacity={0.8}
              >
                <Text style={[styles.periodText, mode === m && styles.periodTextActive]}>
                  {m === 'today' ? 'Today' : m === '7d' ? '7 Days' : '30 Days'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.periodPill, styles.periodPillCalendar, (mode === 'custom' || showCalendar) && styles.periodPillCalendarActive]}
              onPress={() => {
                if (mode !== 'custom') {
                  // Seed the calendar with appropriate preset dates
                  const { start, end } = getPresetDates(mode);
                  setRangeStart(start);
                  setRangeEnd(end);
                  setPickingEnd(false);
                }
                setShowCalendar((v) => !v);
              }}
              activeOpacity={0.8}
            >
              <CalendarRange size={14} color={(mode === 'custom' || showCalendar) ? '#1A0C08' : 'rgba(255,255,255,0.65)'} strokeWidth={2.5} />
              <Text style={[styles.periodText, (mode === 'custom' || showCalendar) && styles.periodTextActive]}>
                {mode === 'custom' ? 'Range' : 'Pick'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inline calendar picker */}
          {showCalendar && (
            <View style={styles.calendarCard}>
              {/* Month nav */}
              <View style={styles.calNavRow}>
                <TouchableOpacity style={styles.calNavBtn} onPress={prevMonth} activeOpacity={0.8}>
                  <ChevronLeft size={18} color={riderTheme.colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.calMonthLabel}>
                  {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
                </Text>
                <TouchableOpacity
                  style={[styles.calNavBtn, new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1) > today && styles.calNavBtnDisabled]}
                  onPress={nextMonth}
                  activeOpacity={0.8}
                  disabled={new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1) > today}
                >
                  <ChevronRight size={18} color={new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1) > today ? 'rgba(26,12,8,0.2)' : riderTheme.colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {/* Day headers */}
              <View style={styles.calDayHeaders}>
                {DAYS.map((d) => <Text key={d} style={styles.calDayHeader}>{d}</Text>)}
              </View>

              {/* Day grid */}
              <CalendarGrid
                calMonth={calMonth}
                today={today}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                pickingEnd={pickingEnd}
                onDayPress={handleCalendarDayPress}
              />

              {/* Range display + apply */}
              <View style={styles.calFooter}>
                <View style={styles.calRangeDisplay}>
                  <View style={[styles.calRangeChip, !pickingEnd && styles.calRangeChipActive]}>
                    <Text style={styles.calRangeChipLabel}>FROM</Text>
                    <Text style={styles.calRangeChipDate}>{rangeStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                  <View style={styles.calRangeArrow}>
                    <ChevronRight size={14} color={riderTheme.colors.textMuted} strokeWidth={2} />
                  </View>
                  <View style={[styles.calRangeChip, pickingEnd && styles.calRangeChipActive]}>
                    <Text style={styles.calRangeChipLabel}>TO</Text>
                    <Text style={styles.calRangeChipDate}>{rangeEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.calApplyBtn} onPress={handleApplyRange} activeOpacity={0.88}>
                  <Text style={styles.calApplyBtnText}>Apply Range</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── BREAKDOWN ── */}
        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchEarnings} tintColor="#E8352A" colors={['#E8352A']} />
          }
        >
          {!isLoading && earnings && earnings.dailyBreakdown && earnings.dailyBreakdown.length > 0 && (
            <Text style={styles.rangeLabel}>{rangeLabel}</Text>
          )}
          {!isLoading && earnings && earnings.dailyBreakdown && earnings.dailyBreakdown.length > 0 && (
            <>
              {/* Unsettled / Settled / CODs tabs */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tab, selectedBreakdownTab === 'unsettled' && styles.tabActive]}
                  onPress={() => setSelectedBreakdownTab('unsettled')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabTxt, selectedBreakdownTab === 'unsettled' && styles.tabTxtActive]}>
                    Unsettled · {unsettled.length}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, selectedBreakdownTab === 'settled' && styles.tabActive]}
                  onPress={() => setSelectedBreakdownTab('settled')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabTxt, selectedBreakdownTab === 'settled' && styles.tabTxtActive]}>
                    Settled · {settled.length}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, selectedBreakdownTab === 'cod' && styles.tabActiveCod]}
                  onPress={() => setSelectedBreakdownTab('cod')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabTxt, selectedBreakdownTab === 'cod' && styles.tabTxtActiveCod]}>
                    CODs · {codRows.length}
                  </Text>
                </TouchableOpacity>
              </View>

              {rows.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    {selectedBreakdownTab === 'cod'
                      ? 'No COD collections for this period.'
                      : `No ${selectedBreakdownTab} entries for this period.`}
                  </Text>
                </View>
              ) : (
                <View style={styles.rowList}>
                  {rows.map((day, i) => {
                    const codEntry = isCodEntry(day);
                    const bonusEntry = isBonusEntry(day);
                    return (
                      <View key={i} style={styles.row}>
                        <View
                          style={[
                            styles.rowIconCircle,
                            day.settled && styles.rowIconCircleSettled,
                            bonusEntry && styles.rowIconCircleBonus,
                            codEntry && styles.rowIconCircleCod,
                          ]}
                        >
                          {day.settled ? (
                            <CheckCircle2 size={18} color="#22C55E" strokeWidth={2.5} />
                          ) : bonusEntry ? (
                            <Award size={18} color="#D97706" strokeWidth={2.5} />
                          ) : codEntry ? (
                            <Wallet size={18} color="#1A0C08" strokeWidth={2.5} />
                          ) : (
                            <Package size={18} color="#E8352A" strokeWidth={2.5} />
                          )}
                        </View>

                        <View style={styles.rowInfo}>
                          <Text style={styles.rowOrderId} numberOfLines={1}>
                            {bonusEntry
                              ? day.bonusLabel || 'Milestone Bonus'
                              : codEntry
                                ? `COD · ${getDisplayOrderId(day.date, day.orderId) || 'Order'}`
                                : getDisplayOrderId(day.date, day.orderId) || 'Delivery'}
                          </Text>
                          <View style={styles.rowMeta}>
                            {day.date && (
                              <View style={styles.rowMetaItem}>
                                <Calendar size={11} color="#9E7A6A" strokeWidth={2} />
                                <Text style={styles.rowMetaTxt}>{getDisplayDate(day.date)}</Text>
                              </View>
                            )}
                            {bonusEntry ? (
                              <View style={styles.rowMetaItem}>
                                <Award size={11} color="#9E7A6A" strokeWidth={2} />
                                <Text style={styles.rowMetaTxt}>
                                  {day.milestoneStops ?? 0} stop target reached
                                </Text>
                              </View>
                            ) : codEntry ? (
                              <View style={styles.rowMetaItem}>
                                <Wallet size={11} color="#9E7A6A" strokeWidth={2} />
                                <Text style={styles.rowMetaTxt}>Cash collected from customer</Text>
                              </View>
                            ) : (
                              <>
                                <View style={styles.rowMetaItem}>
                                  <Package size={11} color="#9E7A6A" strokeWidth={2} />
                                  <Text style={styles.rowMetaTxt}>{day.totalDeliveries ?? 0} deliveries</Text>
                                </View>
                                <View style={styles.rowMetaItem}>
                                  <Clock size={11} color="#9E7A6A" strokeWidth={2} />
                                  <Text style={styles.rowMetaTxt}>{day.onlineTimeMinutes ?? 0}m</Text>
                                </View>
                              </>
                            )}
                          </View>
                          {day.settled && day.settlementId && (
                            <Text style={styles.settlementId}>ID: {day.settlementId}</Text>
                          )}
                        </View>

                        <Text
                          style={[
                            styles.rowAmount,
                            day.settled && styles.rowAmountSettled,
                            bonusEntry && styles.rowAmountBonus,
                            codEntry && styles.rowAmountCod,
                          ]}
                        >
                          {codEntry
                            ? `₹${Math.abs(day.cashCollected ?? day.totalEarnings ?? 0).toFixed(0)}`
                            : `₹${(day.totalEarnings ?? 0).toFixed(0)}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {!isLoading && (!earnings || !earnings.dailyBreakdown || earnings.dailyBreakdown.length === 0) && (
            <View style={styles.bigEmpty}>
              <View style={styles.bigEmptyCircle}>
                <IndianRupee size={48} color="#E8352A" strokeWidth={1.5} />
              </View>
              <Text style={styles.bigEmptyTitle}>No Earnings Yet</Text>
              <Text style={styles.bigEmptyBody}>Complete deliveries to see your income breakdown here.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // day cell
  calDayRow: { flexDirection: 'row', marginBottom: 4 },
  calDayCell: {
    flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 999, maxHeight: 36,
  },
  calDayCellStart: { backgroundColor: '#E8352A' },
  calDayCellEnd: { backgroundColor: '#E8352A' },
  calDayCellInRange: { backgroundColor: '#FCECEA', borderRadius: 0 },
  calDayCellInRangeStart: { borderTopLeftRadius: 999, borderBottomLeftRadius: 999 },
  calDayCellInRangeEnd: { borderTopRightRadius: 999, borderBottomRightRadius: 999 },
  calDayCellFuture: { opacity: 0.25 },
  calDayText: { fontSize: 13, fontWeight: '600', color: riderTheme.colors.textPrimary },
  calDayTextSelected: { color: '#FFFFFF', fontWeight: '800' },
  calDayTextInRange: { color: riderTheme.colors.primaryDark },
  calDayTextMuted: { color: riderTheme.colors.textMuted, fontWeight: '400' },

  root: { flex: 1, backgroundColor: '#FFFDF7' },

  // HERO
  hero: {
    backgroundColor: '#1A0C08',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 24,
  },

  // MINI STATS
  miniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 0,
    alignSelf: 'stretch',
    justifyContent: 'space-evenly',
  },
  miniStat: { alignItems: 'center', gap: 3, flex: 1 },
  miniStatVal: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  miniStatValCod: { color: '#FFC52E' },
  miniStatLbl: { fontSize: 9.5, fontWeight: '500', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
  miniDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },

  // PERIOD / RANGE ROW
  periodRow: { flexDirection: 'row', gap: 8, flexWrap: 'nowrap', justifyContent: 'center' },
  periodPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  periodPillActive: { backgroundColor: '#FFC52E', borderColor: '#FFC52E' },
  periodPillCalendar: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12,
  },
  periodPillCalendarActive: { backgroundColor: '#FFC52E', borderColor: '#FFC52E' },
  periodText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  periodTextActive: { color: '#1A0C08' },

  // RANGE LABEL
  rangeLabel: {
    fontSize: 12, fontWeight: '600', color: riderTheme.colors.textMuted,
    marginBottom: 10, textAlign: 'center',
  },

  // CALENDAR CARD
  calendarCard: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: riderTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  calNavRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  calNavBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: riderTheme.colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  calNavBtnDisabled: { opacity: 0.35 },
  calMonthLabel: { fontSize: 16, fontWeight: '800', color: riderTheme.colors.textPrimary },
  calDayHeaders: { flexDirection: 'row', marginBottom: 6 },
  calDayHeader: {
    flex: 1, textAlign: 'center',
    fontSize: 11, fontWeight: '700',
    color: riderTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // day cells rendered via component
  calFooter: { marginTop: 14, gap: 12 },
  calRangeDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  calRangeChip: {
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, backgroundColor: riderTheme.colors.surfaceMuted,
    borderWidth: 1.5, borderColor: riderTheme.colors.border,
    minWidth: 80,
  },
  calRangeChipActive: {
    borderColor: riderTheme.colors.primary,
    backgroundColor: riderTheme.colors.primarySoft,
  },
  calRangeChipLabel: { fontSize: 9, fontWeight: '700', color: riderTheme.colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  calRangeChipDate: { fontSize: 14, fontWeight: '800', color: riderTheme.colors.textPrimary },
  calRangeArrow: { opacity: 0.5 },
  calApplyBtn: {
    backgroundColor: riderTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: riderTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  calApplyBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },

  // TABS
  tabRow: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  tab: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999,
    backgroundColor: '#F8F3EF', borderWidth: 1, borderColor: '#E8DDD8',
  },
  tabActive: { backgroundColor: '#1A0C08', borderColor: '#1A0C08' },
  tabActiveCod: { backgroundColor: '#FFC52E', borderColor: '#FFC52E' },
  tabTxt: { fontSize: 13, fontWeight: '700', color: '#9E7A6A' },
  tabTxtActive: { color: '#FFFFFF' },
  tabTxtActiveCod: { color: '#1A0C08' },

  // FEED
  feed: { flex: 1 },
  feedContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },

  // ROW ITEMS
  rowList: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0E8E4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  rowIconCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FCECEA', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconCircleSettled: { backgroundColor: '#DCFCE7' },
  rowIconCircleBonus: { backgroundColor: '#FEF3C7' },
  rowIconCircleCod: { backgroundColor: '#FEF9C3', borderWidth: 1, borderColor: '#FACC15' },
  rowInfo: { flex: 1, gap: 4 },
  rowOrderId: { fontSize: 14, fontWeight: '800', color: '#1A0C08' },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowMetaTxt: { fontSize: 11, fontWeight: '500', color: '#9E7A6A' },
  settlementId: { fontSize: 11, color: '#22C55E', fontWeight: '600', marginTop: 2 },
  // Amounts the rider actually earns/will receive are shown in green.
  // COD rows (cash held by the rider, owed back to the platform) stay amber
  // to visually mark them as "not your earnings".
  rowAmount: { fontSize: 18, fontWeight: '900', color: '#16A34A', flexShrink: 0 },
  rowAmountSettled: { color: '#16A34A' },
  rowAmountBonus: { color: '#16A34A' },
  rowAmountCod: { color: '#A16207' },

  // EMPTY (within feed)
  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9E7A6A', fontWeight: '500' },

  // BIG EMPTY (no data)
  bigEmpty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 36 },
  bigEmptyCircle: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: '#FCECEA', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  bigEmptyTitle: { fontSize: 22, fontWeight: '900', color: '#1A0C08', marginBottom: 10 },
  bigEmptyBody: { fontSize: 14, color: '#5C3D2E', textAlign: 'center', lineHeight: 22 },
});
