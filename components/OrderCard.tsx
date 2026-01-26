/**
 * Order Card Component
 * Displays order summary in list view
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { MapPin, Home, Package, IndianRupee, Navigation } from 'lucide-react-native';
import { RiderOrder } from '@/types';
import { StatusBadge } from './StatusBadge';
import { formatDistance, calculateDistance } from '@/utils/distance';

interface OrderCardProps {
  order: RiderOrder;
  onPress: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  riderLocation?: { lat: number; lng: number };
}

export function OrderCard({ order, onPress, onAccept, onReject, riderLocation }: OrderCardProps) {
  const isNewOrder = order.status === 'RIDER_ASSIGNED';
  const isActive = ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.status);
  const isCompleted = order.status === 'DELIVERED';

  // Calculate distance to pickup
  let distanceToPickup: number | undefined;
  if (riderLocation && order.pickupLat && order.pickupLng) {
    distanceToPickup = calculateDistance(
      riderLocation.lat,
      riderLocation.lng,
      order.pickupLat,
      order.pickupLng
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card, 
        isNewOrder && styles.cardNew
      ]}
      onPress={isCompleted ? undefined : onPress}
      disabled={isCompleted}
      activeOpacity={isCompleted ? 1 : 0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.orderId}>#{order.orderId}</Text>
        <StatusBadge status={order.status} />
      </View>

      {/* Restaurant Info */}
      <View style={styles.location}>
        <MapPin size={18} color="#EF4444" />
        <View style={styles.locationInfo}>
          <Text style={styles.locationLabel}>Pickup</Text>
          <Text style={styles.locationText}>{order.restaurantName}</Text>
          {order.pickupAddress && (
            <Text style={styles.locationAddress} numberOfLines={1}>
              {order.pickupAddress}
            </Text>
          )}
        </View>
        {distanceToPickup !== undefined && (
          <View style={styles.distanceBadge}>
            <Navigation size={12} color="#10B981" />
            <Text style={styles.distanceText}>{formatDistance(distanceToPickup)}</Text>
          </View>
        )}
      </View>

      {/* Customer Info */}
      <View style={styles.location}>
        <Home size={18} color="#10B981" />
        <View style={styles.locationInfo}>
          <Text style={styles.locationLabel}>Delivery</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            {order.deliveryAddress}
          </Text>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Package size={16} color="#6B7280" />
          <Text style={styles.detailText}>{order.items.length} items</Text>
        </View>
        <View style={styles.detailItem}>
          <IndianRupee size={16} color="#10B981" />
          <Text style={styles.detailValue}>₹{order.deliveryFee}</Text>
        </View>
      </View>

      {/* Pickup OTP for RIDER_ASSIGNED orders */}
      {order.status === 'RIDER_ASSIGNED' && order.deliveryOtp && (
        <View style={styles.otpBadge}>
          <Text style={styles.otpLabel}>Pickup OTP:</Text>
          <Text style={styles.otpText}>{order.deliveryOtp}</Text>
        </View>
      )}

      {/* Action Button for New Orders */}
      {isNewOrder && onAccept && (
        <TouchableOpacity
          style={styles.pickedUpButton}
          onPress={(e) => {
            e.stopPropagation();
            onAccept();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.pickedUpButtonText}>PICKED UP</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardNew: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  locationInfo: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  locationAddress: {
    fontSize: 12,
    color: '#6B7280',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  otpBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  otpText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 4,
  },
  pickedUpButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  pickedUpButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
