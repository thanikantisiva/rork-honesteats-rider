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
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Package, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrders } from '@/contexts/OrdersContext';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { OrderCard } from '@/components/OrderCard';
import { useThemedAlert } from '@/components/ThemedAlert';

type TabFilter = 'active' | 'completed';

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rider } = useAuth();
  const { orders, activeOrders, completedOrders, isLoading, isLoadingCompleted, refreshOrders, refreshCompletedOrders, acceptOrder, rejectOrder } = useOrders();
  const { isOnline, toggleOnline, currentLocation } = useLocation();
  const { showAlert, AlertComponent } = useThemedAlert();
  const [selectedTab, setSelectedTab] = useState<TabFilter>('active');
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [hasLoadedCompleted, setHasLoadedCompleted] = useState(false);

  // Load completed orders when user switches to Completed tab
  React.useEffect(() => {
    if (selectedTab === 'completed' && !hasLoadedCompleted) {
      refreshCompletedOrders();
      setHasLoadedCompleted(true);
    }
  }, [selectedTab, hasLoadedCompleted, refreshCompletedOrders]);

  const handleToggleOnline = async () => {
    setIsTogglingOnline(true);
    try {
      await toggleOnline();
    } catch (error: any) {
      showAlert('Error', 'Failed to update status. Please try again.', undefined, 'error');
    } finally {
      setIsTogglingOnline(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await acceptOrder(orderId);
      showAlert('Picked Up', 'Order marked as picked up. Start delivery when ready.', undefined, 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to mark as picked up', undefined, 'error');
    }
  };

  const handleOrderPress = (orderId: string) => {
    router.push(`/order-details?id=${orderId}` as any);
  };

  // Filter orders based on selected tab
  const filteredOrders = (() => {
    switch (selectedTab) {
      case 'active':
        // All active orders: assigned, picked up, or out for delivery
        return orders.filter((o) => ['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.status));
      case 'completed':
        // Completed/delivered orders
        return completedOrders;
    }
  })();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={styles.greeting}>Hello, {rider?.name.split(' ')[0]}</Text>
            <Text style={styles.subGreeting}>
              {isOnline ? 'You are online' : 'You are offline'}
            </Text>
          </View>
          <View style={styles.onlineToggle}>
            <Text style={[styles.toggleLabel, isOnline && styles.toggleLabelActive]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              disabled={isTogglingOnline}
              trackColor={{ false: '#D1D5DB', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Tab Filters */}
        <View style={styles.tabs}>
          {(['active', 'completed'] as TabFilter[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Orders List */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={selectedTab === 'completed' ? isLoadingCompleted : isLoading}
              onRefresh={selectedTab === 'completed' ? refreshCompletedOrders : refreshOrders}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
        >
          {isLoading && filteredOrders.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Orders</Text>
              <Text style={styles.emptyText}>
                {isOnline
                  ? 'New orders will appear here when assigned'
                  : 'Go online to start receiving orders'}
              </Text>
              {!isOnline && (
                <TouchableOpacity style={styles.goOnlineButton} onPress={handleToggleOnline}>
                  <Text style={styles.goOnlineButtonText}>Go Online</Text>
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
                  onAccept={order.status === ('RIDER_ASSIGNED' as any) ? () => handleAcceptOrder(order.orderId) : undefined}
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subGreeting: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleLabelActive: {
    color: '#10B981',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  goOnlineButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  goOnlineButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ordersList: {
    padding: 16,
  },
});
