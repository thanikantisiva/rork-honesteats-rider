/**
 * Order Card Component
 * Displays order summary in list view
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert } from 'react-native';
import { MapPin, Home, Package, IndianRupee, Navigation, CheckCircle, Truck, Lock } from 'lucide-react-native';
import { RiderOrder } from '@/types';
import { StatusBadge } from './StatusBadge';
import { formatDistance, calculateDistance } from '@/utils/distance';

interface OrderCardProps {
  order: RiderOrder;
  onPress: () => void;
  onAccept?: () => void;
  onReject?: (reason?: string) => void;
  onStartDelivery?: () => void;
  onMarkDelivered?: () => void;
  riderLocation?: { lat: number; lng: number };
}

export function OrderCard({ order, onPress, onAccept, onReject, onStartDelivery, onMarkDelivered, riderLocation }: OrderCardProps) {
  const isOffer = order.status === 'OFFERED_TO_RIDER';
  const isNewOrder = order.status === 'RIDER_ASSIGNED';
  const isPickedUp = order.status === 'PICKED_UP';
  const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
  const isActive = ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.status);
  const isCompleted = order.status === 'DELIVERED';
  // State for OTP verification (for delivery)
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);

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

  // Auto-verify OTP when 4 digits entered
  const handleOtpChange = (text: string) => {
    setEnteredOtp(text);
    
    // Auto-verify when 4 digits entered
    if (text.length === 4 && order.deliveryOtp) {
      if (text === order.deliveryOtp) {
        setIsOtpVerified(true);
        Alert.alert('✓ Verified', 'OTP correct! You can now mark as delivered.');
      } else {
        Alert.alert('✗ Wrong OTP', 'Incorrect OTP. Please try again.');
        setTimeout(() => setEnteredOtp(''), 500);
      }
    }
  };

  const handleMarkDeliveredWithOtp = () => {
    if (!isOtpVerified) {
      Alert.alert('OTP Required', 'Please enter customer\'s OTP first.');
      return;
    }
    if (onMarkDelivered) {
      onMarkDelivered();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card, 
        isOffer && styles.cardOffer,
        isNewOrder && styles.cardNew,
        isPickedUp && styles.cardPickedUp,
        isOutForDelivery && styles.cardOutForDelivery
      ]}
      onPress={isCompleted ? undefined : onPress}
      disabled={isCompleted}
      activeOpacity={isCompleted ? 1 : 0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.orderId}>#{order.orderId}</Text>
        <View style={styles.headerRight}>
          <StatusBadge status={order.status} />
        </View>
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

      {/* Pickup OTP Display - For RIDER_ASSIGNED and PICKED_UP */}
      {['RIDER_ASSIGNED', 'PICKED_UP'].includes(order.status) && order.pickupOtp && (
        <View style={styles.pickupOtpBadge}>
          <Lock size={14} color="#92400E" />
          <Text style={styles.otpLabel}>Pickup OTP (Show to Restaurant):</Text>
          <Text style={styles.otpText}>{order.pickupOtp}</Text>
        </View>
      )}

      {/* Delivery OTP Verification - For OUT_FOR_DELIVERY */}
      {isOutForDelivery && order.deliveryOtp && !isOtpVerified && (
        <View style={styles.otpInputSection}>
          <Text style={styles.otpInputLabel}>Ask customer for OTP:</Text>
          <TextInput
            style={styles.otpInputSimple}
            value={enteredOtp}
            onChangeText={handleOtpChange}
            placeholder="Enter 4-digit OTP"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={4}
            autoFocus={false}
          />
        </View>
      )}

      {isOutForDelivery && isOtpVerified && (
        <View style={styles.otpVerifiedSection}>
          <CheckCircle size={20} color="#10B981" />
          <Text style={styles.otpVerifiedSimple}>OTP Verified ✓</Text>
        </View>
      )}

      {/* Action Buttons */}
      {isOffer && onAccept && onReject && (
        <View style={styles.offerActions}>
          <TouchableOpacity
            style={styles.offerRejectButton}
            onPress={(e) => {
              e.stopPropagation();
              onReject('Rider rejected');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.offerRejectButtonText}>REJECT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.offerAcceptButton}
            onPress={(e) => {
              e.stopPropagation();
              onAccept();
            }}
            activeOpacity={0.8}
          >
            <CheckCircle size={18} color="#FFFFFF" />
            <Text style={styles.offerAcceptButtonText}>ACCEPT</Text>
          </TouchableOpacity>
        </View>
      )}

      {isNewOrder && onAccept && (
        <TouchableOpacity
          style={styles.pickedUpButton}
          onPress={(e) => {
            e.stopPropagation();
            onAccept();
          }}
          activeOpacity={0.8}
        >
          <CheckCircle size={18} color="#FFFFFF" />
          <Text style={styles.pickedUpButtonText}>PICKED UP</Text>
        </TouchableOpacity>
      )}

      {isPickedUp && onStartDelivery && (
        <TouchableOpacity
          style={styles.startDeliveryButton}
          onPress={(e) => {
            e.stopPropagation();
            onStartDelivery();
          }}
          activeOpacity={0.8}
        >
          <Truck size={18} color="#FFFFFF" />
          <Text style={styles.startDeliveryButtonText}>START DELIVERY</Text>
        </TouchableOpacity>
      )}

      {isOutForDelivery && onMarkDelivered && (
        <TouchableOpacity
          style={[
            styles.markDeliveredButton,
            !isOtpVerified && styles.markDeliveredButtonDisabled
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleMarkDeliveredWithOtp();
          }}
          disabled={!isOtpVerified}
          activeOpacity={0.8}
        >
          <CheckCircle size={18} color="#FFFFFF" />
          <Text style={styles.markDeliveredButtonText}>
            {isOtpVerified ? 'MARK AS DELIVERED' : 'VERIFY OTP FIRST'}
          </Text>
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
  cardOffer: {
    borderColor: '#0EA5E9',
    borderWidth: 2,
    backgroundColor: '#F0F9FF',
  },
  cardNew: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  cardPickedUp: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  cardOutForDelivery: {
    borderColor: '#F59E0B',
    borderWidth: 2,
    backgroundColor: '#FFFBEB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  pickupOtpBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  otpText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 4,
  },
  otpInputSection: {
    marginBottom: 12,
  },
  otpInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  otpInputSimple: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#111827',
  },
  otpVerifiedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  otpVerifiedSimple: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  pickedUpButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  pickedUpButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  startDeliveryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  startDeliveryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  markDeliveredButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  markDeliveredButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  markDeliveredButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  offerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  offerRejectButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  offerRejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B91C1C',
    letterSpacing: 1,
  },
  offerAcceptButton: {
    flex: 1.2,
    backgroundColor: '#0EA5E9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  offerAcceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
