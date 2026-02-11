/**
 * Order Card Component
 * Displays order summary in list view
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
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
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpEntry, setOtpEntry] = useState('');

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

  const handleConfirmOtp = () => {
    if (!order.deliveryOtp) {
      Alert.alert('OTP Required', 'Delivery OTP is missing for this order.');
      return;
    }
    if (otpEntry.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit OTP.');
      return;
    }
    if (otpEntry !== order.deliveryOtp) {
      Alert.alert('Incorrect OTP', 'The OTP you entered is incorrect.');
      return;
    }
    setOtpModalVisible(false);
    setOtpEntry('');
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
          onPress={(e) => {
            e.stopPropagation();
            setOtpModalVisible(true);
          }}
          style={styles.markDeliveredButton}
          activeOpacity={0.8}
        >
          <CheckCircle size={18} color="#FFFFFF" />
          <Text style={styles.markDeliveredButtonText}>MARK AS DELIVERED</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={otpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter Delivery OTP</Text>
            <TextInput
              style={styles.modalInput}
              value={otpEntry}
              onChangeText={(text) => setOtpEntry(text.replace(/[^0-9]/g, ''))}
              placeholder="4-digit OTP"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setOtpModalVisible(false);
                  setOtpEntry('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirmOtp}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>Verify & Deliver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  markDeliveredButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 6,
    color: '#111827',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  modalConfirmButton: {
    flex: 1.2,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
