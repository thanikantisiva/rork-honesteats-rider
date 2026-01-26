/**
 * Order Details Screen
 * Detailed view of assigned order with actions
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { MapPin, Phone, Navigation, Package, CheckCircle } from 'lucide-react-native';
import { useOrders } from '@/contexts/OrdersContext';
import { StatusBadge } from '@/components/StatusBadge';
import { useThemedAlert } from '@/components/ThemedAlert';
import { RiderOrder } from '@/types';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { orders, updateOrderStatus } = useOrders();
  const { showAlert, AlertComponent } = useThemedAlert();
  const [order, setOrder] = useState<RiderOrder | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const foundOrder = orders.find((o) => o.orderId === params.id);
    if (foundOrder) {
      setOrder(foundOrder);
    }
  }, [params.id, orders]);

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleNavigate = (lat: number, lng: number, label: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    Linking.openURL(url);
  };

  const handleMarkPickedUp = async () => {
    setIsUpdating(true);
    try {
      await updateOrderStatus(order.orderId, 'OUT_FOR_DELIVERY');
      showAlert('Out for Delivery', 'Order marked as out for delivery. Navigate to customer now.', undefined, 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update status', undefined, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkDelivered = async () => {
    setIsUpdating(true);
    try {
      await updateOrderStatus(order.orderId, 'DELIVERED');
      showAlert(
        'Delivered!',
        'Order completed successfully. Great job!',
        [
          {
            text: 'OK',
            style: 'default',
            onPress: () => router.back(),
          },
        ],
        'success'
      );
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to deliver', undefined, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Order Details' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Order #{order.orderId.slice(0, 8)}</Text>
            <StatusBadge status={order.status} />
          </View>

          {/* Restaurant Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup Location</Text>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPin size={20} color="#EF4444" />
                <Text style={styles.cardTitle}>{order.restaurantName}</Text>
              </View>
              {order.pickupAddress && (
                <Text style={styles.cardText}>{order.pickupAddress}</Text>
              )}
              <View style={styles.cardActions}>
                {order.pickupLat && order.pickupLng && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleNavigate(order.pickupLat!, order.pickupLng!, 'Restaurant')}
                  >
                    <Navigation size={16} color="#3B82F6" />
                    <Text style={styles.actionButtonText}>Navigate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Customer Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Location</Text>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPin size={20} color="#10B981" />
                <Text style={styles.cardTitle}>Customer</Text>
              </View>
              <Text style={styles.cardText}>{order.deliveryAddress}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCall(order.customerPhone)}
                >
                  <Phone size={16} color="#3B82F6" />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
                {order.deliveryLat && order.deliveryLng && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleNavigate(order.deliveryLat!, order.deliveryLng!, 'Customer')}
                  >
                    <Navigation size={16} color="#3B82F6" />
                    <Text style={styles.actionButtonText}>Navigate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Order Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            <View style={styles.card}>
              {order.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {item.quantity}x {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Delivery Fee</Text>
                <Text style={styles.totalValue}>₹{order.deliveryFee}</Text>
              </View>
            </View>
          </View>

          {/* Pickup OTP Section (show to restaurant) */}
          {['RIDER_ASSIGNED', 'PICKED_UP'].includes(order.status as any) && order.deliveryOtp && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pickup OTP</Text>
              <View style={[styles.card, styles.otpCard]}>
                <Text style={styles.otpLabel}>Show this OTP to restaurant:</Text>
                <View style={styles.otpDisplay}>
                  <Text style={styles.otpDisplayText}>{order.deliveryOtp}</Text>
                </View>
                <Text style={styles.otpHint}>Restaurant will verify this code before handing over the order</Text>
              </View>
            </View>
          )}

        </ScrollView>

        {/* Action Footer */}
        <View style={styles.footer}>
          {order.status === 'PICKED_UP' && (
            <TouchableOpacity
              style={[styles.primaryButton, isUpdating && styles.primaryButtonDisabled]}
              onPress={handleMarkPickedUp}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Start Delivery</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {order.status === 'OUT_FOR_DELIVERY' && (
            <TouchableOpacity
              style={[styles.primaryButton, styles.deliverButton, isUpdating && styles.primaryButtonDisabled]}
              onPress={handleMarkDelivered}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Mark as Delivered</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <AlertComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  orderHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  otpLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  otpCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  otpDisplay: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
  },
  otpDisplayText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 12,
  },
  otpHint: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deliverButton: {
    backgroundColor: '#10B981',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
