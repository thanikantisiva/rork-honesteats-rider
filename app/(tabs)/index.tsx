/**
 * Orders Screen — Compact hero with milestone bar
 */

import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Animated, Switch,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Package, Bike, Wifi, Star, Trophy, BellRing } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOrders } from "@/contexts/OrdersContext";
import { useLocation } from "@/contexts/LocationContext";
import { useAuth } from "@/contexts/AuthContext";
import { riderEarningsAPI } from "@/lib/api";
import { OrderCard } from "@/components/OrderCard";
import { useThemedAlert } from "@/components/ThemedAlert";
import { useForceUpdate } from "@/hooks/useForceUpdate";
import { ForceUpdateModal } from "@/components/ForceUpdateModal";
import { RiderBonusCampaign, RiderBonusProgress } from "@/types";

type TabFilter = "active" | "completed";

const formatBonusDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

function MilestoneBar({
  campaign,
  progress,
}: {
  campaign: RiderBonusCampaign;
  progress: RiderBonusProgress;
}) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const targetStops = Math.max(
    campaign.targetStops || 0,
    campaign.milestones[campaign.milestones.length - 1]?.stops || 0,
    1
  );
  const clampedStops = Math.min(progress.completedStops || 0, targetStops);
  const pct = clampedStops / targetStops;
  const nextMilestone = progress.nextMilestone;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: pct,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={mb.card}>
      <View style={mb.header}>
        <View style={mb.headerLeft}>
          <Trophy size={14} color="#E8352A" strokeWidth={2.5} />
          <View>
            <Text style={mb.title}>{campaign.title || "Bonus Milestone"}</Text>
            <Text style={mb.range}>
              {formatBonusDate(campaign.startDate)} - {formatBonusDate(campaign.endDate)}
            </Text>
          </View>
        </View>
        <Text style={mb.counter}>
          <Text style={mb.counterBold}>{clampedStops}</Text>/{targetStops} stops
        </Text>
      </View>

      <View style={mb.track}>
        <Animated.View
          style={[
            mb.fill,
            {
              width: fillAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
        {campaign.milestones.map((milestone) => {
          const pos = milestone.stops / targetStops;
          const reached = clampedStops >= milestone.stops;
          return (
            <View
              key={`${milestone.stops}-${milestone.amount}`}
              style={[mb.marker, { left: `${pos * 100}%` as any }]}
            >
              <View style={[mb.dot, reached && mb.dotReached]} />
            </View>
          );
        })}
      </View>

      <View style={mb.labelsRow}>
        {campaign.milestones.map((milestone) => {
          const reached = clampedStops >= milestone.stops;
          return (
            <View
              key={`${milestone.stops}-${milestone.amount}-label`}
              style={[mb.labelItem, { left: `${(milestone.stops / targetStops) * 100}%` as any }]}
            >
              <Text style={[mb.bonusAmt, reached && mb.bonusAmtReached]}>₹{milestone.amount}</Text>
              <Text style={mb.rideLabel}>@{milestone.stops}</Text>
            </View>
          );
        })}
      </View>
      <Text style={mb.footerText}>
        {nextMilestone
          ? `${nextMilestone.remainingStops} more stop${nextMilestone.remainingStops === 1 ? "" : "s"} to unlock ₹${nextMilestone.amount}`
          : `Campaign target reached. Bonus earned: ₹${(progress.totalBonusEarned ?? 0).toFixed(0)}`}
      </Text>
    </View>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rider } = useAuth();
  const {
    orders, activeOrders, completedOrders, ringingOrderIds, riderRating, riderRatedCount,
    isLoading, isLoadingCompleted, refreshOrders, refreshCompletedOrders,
    acceptOrder, rejectOrder, dismissOrderAlert, muteOrderAlert, muteAllAlerts, updateOrderStatus,
  } = useOrders();
  const { isOnline, toggleOnline, currentLocation } = useLocation();
  const { showAlert, AlertComponent } = useThemedAlert();
  const { needsUpdate, openStore } = useForceUpdate();
  const [selectedTab, setSelectedTab] = useState<TabFilter>("active");
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [loadingOrderIds, setLoadingOrderIds] = useState<Set<string>>(new Set());
  const [bonusCampaign, setBonusCampaign] = useState<RiderBonusCampaign | null>(null);
  const [bonusProgress, setBonusProgress] = useState<RiderBonusProgress | null>(null);

  const headerScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!rider?.riderId) return;
    refreshCompletedOrders();
  }, [rider?.riderId, refreshCompletedOrders]);

  React.useEffect(() => {
    if (!rider?.riderId) {
      setBonusCampaign(null);
      setBonusProgress(null);
      return;
    }

    let cancelled = false;
    riderEarningsAPI
      .getBonusProgress(rider.riderId)
      .then((data) => {
        if (cancelled) return;
        setBonusCampaign(data?.campaign ?? null);
        setBonusProgress(data?.progress ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setBonusCampaign(null);
        setBonusProgress(null);
      });

    return () => {
      cancelled = true;
    };
  }, [rider?.riderId, completedOrders.length]);

  const addLoadingOrder = (id: string) =>
    setLoadingOrderIds((p) => new Set(p).add(id));
  const removeLoadingOrder = (id: string) =>
    setLoadingOrderIds((p) => { const n = new Set(p); n.delete(id); return n; });

  const handleToggleOnline = async () => {
    if (isOnline && activeOrders.length > 0) {
      showAlert(
        "Cannot Go Offline",
        `You have ${activeOrders.length} active order${activeOrders.length > 1 ? "s" : ""}. Complete all deliveries first.`,
        undefined, "warning"
      );
      return;
    }
    Animated.sequence([
      Animated.timing(headerScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.spring(headerScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    setIsTogglingOnline(true);
    try { await toggleOnline(); }
    catch { showAlert("Error", "Could not switch. Check location settings.", undefined, "error"); }
    finally { setIsTogglingOnline(false); }
  };

  const handleAcceptOrder = async (orderId: string, status: "RIDER_ASSIGNED" | "PICKED_UP") => {
    if (loadingOrderIds.has(orderId)) return;
    addLoadingOrder(orderId);
    try { await acceptOrder(orderId, status); }
    catch (e: any) { showAlert("Error", e.message || "Failed to update order", undefined, "error"); }
    finally { removeLoadingOrder(orderId); }
  };

  const handleRejectOrder = async (orderId: string, reason = "Dude rejected") => {
    if (loadingOrderIds.has(orderId)) return;
    addLoadingOrder(orderId);
    try { await rejectOrder(orderId, reason); }
    catch (e: any) { showAlert("Error", e.message || "Failed to reject", undefined, "error"); }
    finally { removeLoadingOrder(orderId); }
  };

  const handleMarkPickedUp = async (orderId: string) => {
    if (loadingOrderIds.has(orderId)) return;
    addLoadingOrder(orderId);
    try { await acceptOrder(orderId, "PICKED_UP"); }
    catch (e: any) { showAlert("Error", e.message || "Failed to mark picked up", undefined, "error"); }
    finally { removeLoadingOrder(orderId); }
  };

  const handleMuteCurrentAlert = async () => {
    try { await muteAllAlerts(); }
    catch (e: any) { showAlert("Error", e?.message || "Could not mute alerts.", undefined, "error"); }
  };

  const handleStartDelivery = async (orderId: string) => {
    if (loadingOrderIds.has(orderId)) return;
    addLoadingOrder(orderId);
    try {
      const o = orders.find((x) => x.orderId === orderId);
      await updateOrderStatus(orderId, "OUT_FOR_DELIVERY");
      if (o?.deliveryLat && o?.deliveryLng) {
        setTimeout(() => {
          Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&destination=${o.deliveryLat},${o.deliveryLng}&travelmode=driving`
          ).catch(() => {});
        }, 500);
      }
    } catch (e: any) { showAlert("Error", e.message || "Failed to start delivery", undefined, "error"); }
    finally { removeLoadingOrder(orderId); }
  };

  const handleMarkDelivered = async (orderId: string, otp?: string) => {
    if (loadingOrderIds.has(orderId)) return;
    addLoadingOrder(orderId);
    try { await updateOrderStatus(orderId, "DELIVERED", otp); }
    catch (e: any) { showAlert("Error", e.message || "Failed to mark delivered", undefined, "error"); }
    finally { removeLoadingOrder(orderId); }
  };

  const filteredOrders =
    selectedTab === "active"
      ? orders.filter((o) =>
          ["OFFERED_TO_RIDER", "RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(o.status)
        )
      : completedOrders;

  const firstName = rider?.name?.split(" ")[0] ?? "Rider";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  return (
    <>
      <ForceUpdateModal visible={needsUpdate} onUpdate={openStore} />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>

        {/* ── HEADER ── */}
        <Animated.View
          style={[styles.header, { paddingTop: insets.top + 8 }, { transform: [{ scale: headerScale }] }]}
        >
          {/* Row 1: name + rating */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Good {greeting}</Text>
              <Text style={styles.riderName} numberOfLines={1}>{firstName}</Text>
            </View>
            <View style={styles.headerRight}>
              {riderRating != null && (
                <View style={styles.ratingChip}>
                  <Star size={11} color="rgba(255,255,255,0.85)" fill="rgba(255,255,255,0.85)" strokeWidth={0} />
                  <Text style={styles.ratingVal}>{riderRating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Row 2: status + toggle */}
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              {isOnline ? (
                <>
                  <View style={styles.onlineDot} />
                  <Text style={styles.statusTextOn}>ONLINE</Text>
                  {activeOrders.length > 0 && (
                    <View style={styles.activeBadge}>
                      <Package size={10} color="#1A0C08" strokeWidth={2.5} />
                      <Text style={styles.activeBadgeText}>{activeOrders.length}</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.offlineDot} />
                  <Text style={styles.statusTextOff}>OFFLINE</Text>
                </>
              )}
            </View>
            {isTogglingOnline ? (
              <ActivityIndicator size="small" color="#E8352A" />
            ) : (
              <Switch
                value={isOnline}
                onValueChange={handleToggleOnline}
                trackColor={{ false: "#E8DDD8", true: "#22C55E" }}
                thumbColor={"#FFFFFF"}
                ios_backgroundColor="#E8DDD8"
              />
            )}
          </View>

          {ringingOrderIds.length > 0 && (
            <TouchableOpacity
              style={styles.muteAlertBanner}
              onPress={handleMuteCurrentAlert}
              activeOpacity={0.86}
            >
              <View style={styles.muteAlertBannerLeft}>
                <BellRing size={16} color="#1A0C08" strokeWidth={2.5} />
                <Text style={styles.muteAlertBannerTitle}>Mute all alerts</Text>
              </View>
              <Text style={styles.muteAlertBannerMeta}>
                {ringingOrderIds.length > 1 ? `${ringingOrderIds.length} orders ringing` : "Tap to silence"}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── MILESTONE BAR ── */}
        {bonusCampaign && bonusProgress && (
          <View style={styles.milestoneSection}>
            <MilestoneBar campaign={bonusCampaign} progress={bonusProgress} />
          </View>
        )}

        {/* ── TABS ── */}
        <View style={styles.tabBar}>
          {(["active", "completed"] as TabFilter[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, selectedTab === t && styles.tabBtnActive]}
              onPress={() => setSelectedTab(t)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabTxt, selectedTab === t && styles.tabTxtActive]}>
                {t === "active"
                  ? `Active${activeOrders.length > 0 ? ` · ${activeOrders.length}` : ""}`
                  : "History"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── FEED ── */}
        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={selectedTab === "completed" ? isLoadingCompleted : isLoading}
              onRefresh={
                selectedTab === "completed"
                  ? refreshCompletedOrders
                  : () => refreshOrders(true)
              }
              tintColor="#E8352A"
              colors={["#E8352A"]}
            />
          }
        >
          {isLoading && filteredOrders.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#E8352A" />
              <Text style={styles.loadingText}>Loading orders…</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyCircle}>
                <Bike size={44} color="#E8352A" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>
                {isOnline ? "No orders yet" : "You're offline"}
              </Text>
              <Text style={styles.emptyBody}>
                {isOnline
                  ? "New orders will appear here when assigned to you."
                  : "Flip the toggle above to go online and start receiving orders."}
              </Text>
              {!isOnline && (
                <TouchableOpacity
                  style={[styles.goOnlineBtn, isTogglingOnline && { opacity: 0.6 }]}
                  onPress={handleToggleOnline}
                  disabled={isTogglingOnline}
                  activeOpacity={0.85}
                >
                  <Wifi size={16} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.goOnlineBtnText}>Go Online</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.cardList}>
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  onPress={() => router.push(`/order-details?id=${order.orderId}` as any)}
                  onAccept={
                    order.status === "OFFERED_TO_RIDER"
                      ? () => handleAcceptOrder(order.orderId, "RIDER_ASSIGNED")
                      : undefined
                  }
                  onReject={
                    order.status === "OFFERED_TO_RIDER"
                      ? (r?: string) => handleRejectOrder(order.orderId, r)
                      : undefined
                  }
                  onStartDelivery={
                    order.status === "PICKED_UP"
                      ? () => handleStartDelivery(order.orderId)
                      : undefined
                  }
                  onMarkDelivered={
                    order.status === "OUT_FOR_DELIVERY"
                      ? (otp?: string) => handleMarkDelivered(order.orderId, otp)
                      : undefined
                  }
                  onMarkPickedUp={
                    order.status === "RIDER_ASSIGNED"
                      ? () => handleMarkPickedUp(order.orderId)
                      : undefined
                  }
                  riderId={rider?.riderId}
                  riderLocation={currentLocation || undefined}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
      <AlertComponent />
    </>
  );
}

// ── MilestoneBar styles ──
const mb = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: "#1A0C08",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 12, fontWeight: "700", color: "#1A0C08", letterSpacing: 0.4, textTransform: "uppercase" },
  range: { fontSize: 10, color: "#9E7A6A", marginTop: 1 },
  counter: { fontSize: 12, color: "#9E7A6A" },
  counterBold: { fontWeight: "800", color: "#1A0C08", fontSize: 13 },

  track: {
    height: 8,
    backgroundColor: "#F0E8E4",
    borderRadius: 999,
    overflow: "visible",
    position: "relative",
    marginBottom: 22,
  },
  fill: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    backgroundColor: "#E8352A",
    borderRadius: 999,
  },
  marker: {
    position: "absolute",
    top: "50%",
    marginTop: -7,
    marginLeft: -7,
    width: 14, height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 2, borderColor: "#D4C4BE",
  },
  dotReached: { backgroundColor: "#E8352A", borderColor: "#C0261C" },

  labelsRow: { position: "relative", height: 28 },
  labelItem: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -16 }],
  },
  bonusAmt: { fontSize: 11, fontWeight: "800", color: "#BCAFAB" },
  bonusAmtReached: { color: "#E8352A" },
  rideLabel: { fontSize: 9, color: "#BCAFAB", fontWeight: "500" },
  footerText: {
    marginTop: 6,
    fontSize: 11,
    color: "#6B4E42",
    fontWeight: "600",
  },
});

// ── Screen styles ──
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F0EC" },

  // HEADER
  header: {
    backgroundColor: "#1A0C08",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  headerLeft: { flex: 1 },
  headerRight: { gap: 6, alignItems: "flex-end", flexDirection: "row" },
  greeting: { fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.38)", letterSpacing: 0.4 },
  riderName: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.1 },
  ratingChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  ratingVal: { fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.9)" },
  muteAlertBanner: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#FFC52E",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  muteAlertBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  muteAlertBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1A0C08",
  },
  muteAlertBannerMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(26,12,8,0.68)",
  },

  // STATUS ROW
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#22C55E" },
  offlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#9E7A6A" },
  statusTextOn: { fontSize: 11, fontWeight: "800", color: "#22C55E", letterSpacing: 1.2 },
  statusTextOff: { fontSize: 11, fontWeight: "800", color: "#9E7A6A", letterSpacing: 1.2 },
  activeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  activeBadgeText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },

  // MILESTONE SECTION
  milestoneSection: { paddingTop: 14, paddingBottom: 8 },

  // TABS
  tabBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F5F0EC",
  },
  tabBtn: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999,
    backgroundColor: "#EDE8E4", borderWidth: 1, borderColor: "#DDD7D3",
  },
  tabBtnActive: { backgroundColor: "#1A0C08", borderColor: "#1A0C08" },
  tabTxt: { fontSize: 13, fontWeight: "700", color: "#9E7A6A" },
  tabTxtActive: { color: "#FFFFFF" },

  // FEED
  feed: { flex: 1 },
  feedContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
  cardList: { gap: 12 },

  // LOADING
  centered: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  loadingText: { fontSize: 14, fontWeight: "500", color: "#9E7A6A" },

  // EMPTY
  emptyWrap: { alignItems: "center", paddingTop: 52, paddingHorizontal: 36 },
  emptyCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "#FCECEA", alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#1A0C08", marginBottom: 8 },
  emptyBody: { fontSize: 13, color: "#9E7A6A", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  goOnlineBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#22C55E", paddingHorizontal: 24, paddingVertical: 13, borderRadius: 999,
    shadowColor: "#22C55E", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  goOnlineBtnText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
});
