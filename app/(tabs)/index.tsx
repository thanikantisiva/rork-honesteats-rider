/**
 * Orders Screen (Home)
 * Main screen showing assigned orders
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Package, Bike } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrders } from '@/contexts/OrdersContext';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { OrderCard } from '@/components/OrderCard';
import { useThemedAlert } from '@/components/ThemedAlert';
import { riderTheme } from '@/theme/riderTheme';

type TabFilter = 'active' | 'completed';

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rider } = useAuth();
  const { orders, activeOrders, completedOrders, isLoading, isLoadingCompleted, refreshOrders, refreshCompletedOrders, acceptOrder, rejectOrder, updateOrderStatus } = useOrders();
  const { isOnline, toggleOnline, currentLocation } = useLocation();
  const { showAlert, AlertComponent } = useThemedAlert();
  const [selectedTab, setSelectedTab] = useState<TabFilter>('active');
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [hasLoadedCompleted, setHasLoadedCompleted] = useState(false);

  React.useEffect(() => {
    if (selectedTab === 'completed' && !hasLoadedCompleted) {
      refreshCompletedOrders();
      setHasLoadedCompleted(true);
    }
  }, [selectedTab, hasLoadedCompleted, refreshCompletedOrders]);

  const handleToggleOnline = async () => {
    const targetStatus = !isOnline;

    if (!targetStatus && activeOrders.length > 0) {
      showAlert(
        'Cannot Go Offline',
        `You have ${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''}. Please complete all deliveries before going offline.`,
        undefined,
        'warning'
      );
      return;
    }

    setIsTogglingOnline(true);
    try {
      await toggleOnline();
      showAlert(
        targetStatus ? 'You\'re Online!' : 'You\'re Offline',
        targetStatus ? 'You will now receive order assignments' : 'You won\'t receive new orders',
        undefined,
        targetStatus ? 'success' : 'info'
      );
    } catch (error: any) {
      showAlert(
        'Error',
        `Failed to go ${targetStatus ? 'online' : 'offline'}. Please check your location permissions and try again.`,
        undefined,
        'error'
      );
    } finally {
      setIsTogglingOnline(false);
    }
  };

  const handleAcceptOrder = async (orderId: string, status: 'RIDER_ASSIGNED' | 'PICKED_UP') => {
    try {
      await acceptOrder(orderId, status);
      if (status === 'PICKED_UP') {
        showAlert('Picked Up', 'Order marked as picked up. Now start delivery to customer.', undefined, 'success');
      } else {
        showAlert('Order Accepted', 'You have accepted the order. Head to the pickup location.', undefined, 'success');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to mark as picked up', undefined, 'error');
    }
  };

  const handleRejectOrder = async (orderId: string, reason: string = 'Dude rejected') => {
    try {
      await rejectOrder(orderId, reason);
      showAlert('Order Rejected', 'You have rejected the order.', undefined, 'info');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reject order', undefined, 'error');
    }
  };

  const handleStartDelivery = async (orderId: string) => {
    try {
      const order = orders.find(o => o.orderId === orderId);

      await updateOrderStatus(orderId, 'OUT_FOR_DELIVERY');

      if (order?.deliveryLat && order?.deliveryLng) {
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLat},${order.deliveryLng}&travelmode=driving`;

        setTimeout(() => {
          Linking.openURL(mapsUrl).catch(err => {
            console.error('Failed to open Google Maps:', err);
          });
        }, 500);
      }

      showAlert('Out for Delivery', 'Opening navigation to customer location...', undefined, 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to start delivery', undefined, 'error');
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'DELIVERED');
      showAlert('Delivered!', 'Order completed successfully. Great job!', undefined, 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to mark as delivered', undefined, 'error');
    }
  };

  const handleOrderPress = (orderId: string) => {
    router.push(`/order-details?id=${orderId}` as any);
  };

  const filteredOrders = (() => {
    switch (selectedTab) {
      case 'active':
        return orders.filter((o) => ['OFFERED_TO_RIDER', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.status));
      case 'completed':
        return completedOrders;
    }
  })();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Modern Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hey there,</Text>
              <Text style={styles.userName}>{rider?.name.split(' ')[0]}</Text>
            </View>
            
            {/* Floating Online Toggle Card */}
            <TouchableOpacity
              style={[styles.onlineCard, isOnline && styles.onlineCardActive]}
              onPress={handleToggleOnline}
              disabled={isTogglingOnline}
              activeOpacity={0.85}
            >
              {isTogglingOnline ? (
                <ActivityIndicator size="small" color={isOnline ? riderTheme.colors.danger : riderTheme.colors.success} />
              ) : (
                <View style={[styles.onlineDot, isOnline && styles.onlineDotActive]} />
              )}
              <Text style={[styles.onlineText, isOnline && styles.onlineTextActive]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Status Info Card */}
          {isOnline && (
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Active Orders</Text>
              <Text style={styles.statusValue}>{activeOrders.length}</Text>
            </View>
          )}
        </View>

        {/* Tab Selector */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            {(['active', 'completed'] as TabFilter[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, selectedTab === tab && styles.tabActive]}
                onPress={() => setSelectedTab(tab)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              refreshing={selectedTab === 'completed' ? isLoadingCompleted : isLoading}
              onRefresh={selectedTab === 'completed' ? refreshCompletedOrders : () => refreshOrders(true)}
              tintColor={riderTheme.colors.primary}
              colors={[riderTheme.colors.primary]}
            />
          }
        >
          {isLoading && filteredOrders.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={riderTheme.colors.primary} />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Bike size={52} color={riderTheme.colors.textMuted} strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>
                {isOnline ? 'No Orders Yet' : 'You\'re Offline'}
              </Text>
              <Text style={styles.emptyText}>
                {isOnline 
                  ? 'New orders will appear here when assigned to you' 
                  : 'Go online to start receiving order assignments'}
              </Text>
              {!isOnline && (
                <TouchableOpacity
                  style={[styles.goOnlineButton, isTogglingOnline && styles.goOnlineButtonDisabled]}
                  onPress={handleToggleOnline}
                  disabled={isTogglingOnline}
                  activeOpacity={0.85}
                >
                  {isTogglingOnline ? (
                    <>
                      <ActivityIndicator size="small" color={riderTheme.colors.textInverse} />
                      <Text style={styles.goOnlineButtonText}>Switching...</Text>
                    </>
                  ) : (
                    <>
                      <Package size={18} color={riderTheme.colors.textInverse} strokeWidth={2.5} />
                      <Text style={styles.goOnlineButtonText}>Go Online Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.ordersList}>
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  onPress={() => handleOrderPress(order.orderId)}
                  onAccept={order.status === 'OFFERED_TO_RIDER' ? () => handleAcceptOrder(order.orderId, 'RIDER_ASSIGNED') : order.status === 'RIDER_ASSIGNED' ? () => handleAcceptOrder(order.orderId, 'PICKED_UP') : undefined}
                  onReject={order.status === 'OFFERED_TO_RIDER' ? (reason?: string) => handleRejectOrder(order.orderId, reason) : undefined}
                  onStartDelivery={order.status === 'PICKED_UP' ? () => handleStartDelivery(order.orderId) : undefined}
                  onMarkDelivered={order.status === 'OUT_FOR_DELIVERY' ? () => handleMarkDelivered(order.orderId) : undefined}
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    letterSpacing: 0.3,
  },
  onlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: riderTheme.colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: riderTheme.radius.full,
    borderWidth: 1.5,
    borderColor: riderTheme.colors.border,
    ...riderTheme.shadow.small,
  },
  onlineCardActive: {
    backgroundColor: riderTheme.colors.successSoft,
    borderColor: riderTheme.colors.success,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: riderTheme.colors.textMuted,
  },
  onlineDotActive: {
    backgroundColor: riderTheme.colors.success,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: riderTheme.colors.textSecondary,
  },
  onlineTextActive: {
    color: riderTheme.colors.successDark,
  },
  statusCard: {
    backgroundColor: riderTheme.colors.primarySoft,
    borderRadius: riderTheme.radius.md,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: riderTheme.colors.primary,
    marginTop: 2,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: riderTheme.colors.textSecondary,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '800',
    color: riderTheme.colors.primary,
  },
  tabsContainer: {
    backgroundColor: riderTheme.colors.surface,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: riderTheme.colors.borderLight,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRadius: riderTheme.radius.lg,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: riderTheme.radius.md,
  },
  tabActive: {
    backgroundColor: riderTheme.colors.primary,
    ...riderTheme.shadow.small,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: riderTheme.colors.textInverse,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: riderTheme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  goOnlineButton: {
    backgroundColor: riderTheme.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: riderTheme.radius.lg,
    marginTop: 24,
    ...riderTheme.shadow.medium,
  },
  goOnlineButtonDisabled: {
    opacity: 0.7,
  },
  goOnlineButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.textInverse,
  },
  ordersList: {
    padding: 20,
  },
});
