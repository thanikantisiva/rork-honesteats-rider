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
  TextInput,
  Linking,
  ActivityIndicator,
} from 'react-native';
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
  const [otp, setOtp] = useState('');
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
      showAlert('Picked Up', 'Order marked as picked up. Navigate to customer now.', undefined, 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update status', undefined, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!otp || otp.length !== 4) {
      showAlert('Invalid OTP', 'Please enter the 4-digit delivery OTP', undefined, 'warning');
      return;
    }

    setIsUpdating(true);
    try {
      await updateOrderStatus(order.orderId, 'DELIVERED', otp);
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
      showAlert('Error', error.message || 'Invalid OTP or failed to deliver', undefined, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Order Details' }} />
      <View style={styles.container}>
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

          {/* OTP Section (for delivery) */}
          {order.status === 'OUT_FOR_DELIVERY' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery OTP</Text>
              <View style={styles.card}>
                <Text style={styles.otpLabel}>Ask customer for 4-digit OTP:</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter OTP"
                  value={otp}
                  onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Footer */}
        <View style={styles.footer}>
          {order.status === 'ACCEPTED' && (
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
                  <Text style={styles.primaryButtonText}>Mark as Picked Up</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {order.status === 'OUT_FOR_DELIVERY' && (
            <TouchableOpacity
              style={[styles.primaryButton, styles.deliverButton, isUpdating && styles.primaryButtonDisabled]}
              onPress={handleMarkDelivered}
              disabled={isUpdating || !otp}
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
  otpInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
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
