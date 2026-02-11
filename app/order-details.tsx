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
import { useLocalSearchParams, Stack } from 'expo-router';
import { MapPin, Phone, Navigation } from 'lucide-react-native';
import { useOrders } from '@/contexts/OrdersContext';
import { StatusBadge } from '@/components/StatusBadge';
import { useThemedAlert } from '@/components/ThemedAlert';
import { RiderOrder } from '@/types';
import { riderTheme } from '@/theme/riderTheme';

export default function OrderDetailsScreen() {
  const params = useLocalSearchParams();
  const { orders } = useOrders();
  const { AlertComponent } = useThemedAlert();
  const [order, setOrder] = useState<RiderOrder | null>(null);

  useEffect(() => {
    const foundOrder = orders.find((o) => o.orderId === params.id);
    if (foundOrder) {
      setOrder(foundOrder);
    }
  }, [params.id, orders]);

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={riderTheme.colors.primary} />
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

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Order Details' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderLabel}>Order ID</Text>
              <Text style={styles.orderId}>#{order.orderId.slice(0, 8)}</Text>
            </View>
            <StatusBadge status={order.status} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup Location</Text>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPin size={19} color={riderTheme.colors.warning} />
                <Text style={styles.cardTitle}>{order.restaurantName}</Text>
              </View>
              {order.pickupAddress && <Text style={styles.cardText}>{order.pickupAddress}</Text>}
              <View style={styles.cardActions}>
                {order.pickupLat && order.pickupLng && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleNavigate(order.pickupLat!, order.pickupLng!, 'Restaurant')}
                    activeOpacity={0.88}
                  >
                    <Navigation size={16} color={riderTheme.colors.primary} />
                    <Text style={styles.actionButtonText}>Navigate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Location</Text>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPin size={19} color={riderTheme.colors.success} />
                <Text style={styles.cardTitle}>Customer</Text>
              </View>
              <Text style={styles.cardText}>{order.deliveryAddress}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCall(order.customerPhone)}
                  activeOpacity={0.88}
                >
                  <Phone size={16} color={riderTheme.colors.primary} />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
                {order.deliveryLat && order.deliveryLng && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleNavigate(order.deliveryLat!, order.deliveryLng!, 'Customer')}
                    activeOpacity={0.88}
                  >
                    <Navigation size={16} color={riderTheme.colors.primary} />
                    <Text style={styles.actionButtonText}>Navigate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            <View style={styles.card}>
              {order.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
                  <Text style={styles.itemPrice}>Rs {item.price * item.quantity}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Delivery Fee</Text>
                <Text style={styles.totalValue}>Rs {order.deliveryFee}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.infoNote}>
              <Text style={styles.infoNoteText}>
                Order actions (Picked Up, Start Delivery, Mark Delivered) remain on the order card in the orders list.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <AlertComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: riderTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: riderTheme.colors.background,
  },
  content: {
    flex: 1,
  },
  orderHeader: {
    backgroundColor: riderTheme.colors.surface,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: riderTheme.colors.borderLight,
    ...riderTheme.shadow.small,
  },
  orderLabel: {
    fontSize: 12,
    color: riderTheme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  orderId: {
    fontSize: 20,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    letterSpacing: 0.3,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
    ...riderTheme.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  cardText: {
    fontSize: 15,
    color: riderTheme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 14,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: riderTheme.colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: riderTheme.radius.lg,
    borderWidth: 1,
    borderColor: riderTheme.colors.primary,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.primary,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: riderTheme.colors.textPrimary,
    flex: 1,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: riderTheme.colors.borderLight,
    marginVertical: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: riderTheme.colors.success,
  },
  infoNote: {
    backgroundColor: riderTheme.colors.infoSoft,
    borderRadius: riderTheme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: riderTheme.colors.info,
    marginBottom: 16,
  },
  infoNoteText: {
    fontSize: 13,
    fontWeight: '500',
    color: riderTheme.colors.infoDark,
    lineHeight: 19,
    textAlign: 'center',
  },
});
