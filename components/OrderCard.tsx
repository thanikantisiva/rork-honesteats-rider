/**
 * Order Card Component
 * Modern premium order card with gradient accents
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { MapPin, Home, Package, IndianRupee, Navigation, CheckCircle, Truck, Lock, ArrowRight } from 'lucide-react-native';
import { RiderOrder } from '@/types';
import { StatusBadge } from './StatusBadge';
import { formatDistance, calculateDistance } from '@/utils/distance';
import { riderTheme } from '@/theme/riderTheme';

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
  const isCompleted = order.status === 'DELIVERED';
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpEntry, setOtpEntry] = useState('');

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

  // Determine card accent color
  const getCardStyle = () => {
    if (isOffer) return styles.cardOffer;
    if (isNewOrder) return styles.cardNew;
    if (isPickedUp) return styles.cardPickedUp;
    if (isOutForDelivery) return styles.cardOutForDelivery;
    return null;
  };

  return (
    <TouchableOpacity
      style={[styles.card, getCardStyle()]}
      onPress={isCompleted ? undefined : onPress}
      disabled={isCompleted}
      activeOpacity={isCompleted ? 1 : 0.85}
    >
      {/* Header with Order ID & Status */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.orderLabel}>Order</Text>
          <Text style={styles.orderId}>#{order.orderId.slice(0, 8).toUpperCase()}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      {/* Locations Section */}
      <View style={styles.locationsContainer}>
        {/* Pickup */}
        <View style={styles.locationRow}>
          <View style={[styles.locationIcon, styles.pickupIcon]}>
            <MapPin size={18} color={riderTheme.colors.warning} strokeWidth={2.5} />
          </View>
          <View style={styles.locationContent}>
            <Text style={styles.locationLabel}>PICKUP</Text>
            <Text style={styles.locationText}>{order.restaurantName}</Text>
            {order.pickupAddress && (
              <Text style={styles.locationAddress} numberOfLines={1}>
                {order.pickupAddress}
              </Text>
            )}
          </View>
          {distanceToPickup !== undefined && (
            <View style={styles.distanceBadge}>
              <Navigation size={11} color={riderTheme.colors.success} strokeWidth={2.5} />
              <Text style={styles.distanceText}>{formatDistance(distanceToPickup)}</Text>
            </View>
          )}
        </View>

        {/* Connector Line */}
        <View style={styles.connectorLine} />

        {/* Delivery */}
        <View style={styles.locationRow}>
          <View style={[styles.locationIcon, styles.deliveryIcon]}>
            <Home size={18} color={riderTheme.colors.success} strokeWidth={2.5} />
          </View>
          <View style={styles.locationContent}>
            <Text style={styles.locationLabel}>DELIVER TO</Text>
            <Text style={styles.locationText} numberOfLines={2}>
              {order.deliveryAddress}
            </Text>
          </View>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.detailsRow}>
        <View style={styles.detailChip}>
          <Package size={16} color={riderTheme.colors.primary} strokeWidth={2.5} />
          <Text style={styles.detailText}>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</Text>
        </View>
        <View style={styles.earningsChip}>
          <IndianRupee size={16} color={riderTheme.colors.success} strokeWidth={2.5} />
          <Text style={styles.earningsText}>₹{order.deliveryFee}</Text>
          <Text style={styles.earningsLabel}>earnings</Text>
        </View>
      </View>

      {/* Pickup OTP Badge */}
      {['RIDER_ASSIGNED', 'PICKED_UP'].includes(order.status) && order.pickupOtp && (
        <View style={styles.otpBadge}>
          <Lock size={15} color={riderTheme.colors.warning} strokeWidth={2.5} />
          <Text style={styles.otpLabel}>Pickup OTP:</Text>
          <Text style={styles.otpValue}>{order.pickupOtp}</Text>
        </View>
      )}

      {/* Action Buttons */}
      {isOffer && onAccept && onReject && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={(e) => {
              e.stopPropagation();
              onReject('Dude rejected');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={(e) => {
              e.stopPropagation();
              onAccept();
            }}
            activeOpacity={0.85}
          >
            <CheckCircle size={18} color={riderTheme.colors.textInverse} strokeWidth={2.5} />
            <Text style={styles.acceptText}>Accept Order</Text>
          </TouchableOpacity>
        </View>
      )}

      {isNewOrder && onAccept && (
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={(e) => {
            e.stopPropagation();
            onAccept();
          }}
          activeOpacity={0.85}
        >
          <CheckCircle size={20} color={riderTheme.colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.primaryActionText}>Mark as Picked Up</Text>
          <ArrowRight size={18} color={riderTheme.colors.textInverse} strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      {isPickedUp && onStartDelivery && (
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={(e) => {
            e.stopPropagation();
            onStartDelivery();
          }}
          activeOpacity={0.85}
        >
          <Truck size={20} color={riderTheme.colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.primaryActionText}>Start Delivery</Text>
          <ArrowRight size={18} color={riderTheme.colors.textInverse} strokeWidth={2.5} />
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
          <CheckCircle size={18} color={riderTheme.colors.textInverse} />
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
              placeholderTextColor={riderTheme.colors.textMuted}
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
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.xl,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: riderTheme.colors.borderLight,
    ...riderTheme.shadow.card,
  },
  cardOffer: {
    borderColor: riderTheme.colors.info,
    backgroundColor: riderTheme.colors.infoSoft,
  },
  cardNew: {
    borderColor: riderTheme.colors.primary,
    backgroundColor: riderTheme.colors.surface,
    borderLeftWidth: 5,
    borderLeftColor: riderTheme.colors.primary,
  },
  cardPickedUp: {
    borderColor: riderTheme.colors.success,
    backgroundColor: riderTheme.colors.surface,
    borderLeftWidth: 5,
    borderLeftColor: riderTheme.colors.success,
  },
  cardOutForDelivery: {
    borderColor: riderTheme.colors.warning,
    backgroundColor: riderTheme.colors.surface,
    borderLeftWidth: 5,
    borderLeftColor: riderTheme.colors.warning,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: riderTheme.colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  orderLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: riderTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
    letterSpacing: 0.3,
  },
  locationsContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: riderTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupIcon: {
    backgroundColor: riderTheme.colors.warningSoft,
  },
  deliveryIcon: {
    backgroundColor: riderTheme.colors.successSoft,
  },
  locationContent: {
    flex: 1,
    gap: 3,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: riderTheme.colors.textMuted,
    letterSpacing: 0.8,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
    lineHeight: 20,
  },
  locationAddress: {
    fontSize: 11,
    color: riderTheme.colors.textSecondary,
    lineHeight: 16,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: riderTheme.colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: riderTheme.radius.full,
    borderWidth: 1,
    borderColor: riderTheme.colors.success,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: riderTheme.colors.successDark,
  },
  connectorLine: {
    width: 2,
    height: 20,
    backgroundColor: riderTheme.colors.borderLight,
    marginLeft: 19,
    marginVertical: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: riderTheme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: riderTheme.radius.full,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '700',
    color: riderTheme.colors.primary,
  },
  earningsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: riderTheme.colors.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: riderTheme.radius.full,
    borderWidth: 1,
    borderColor: riderTheme.colors.success,
  },
  earningsText: {
    fontSize: 14,
    fontWeight: '800',
    color: riderTheme.colors.successDark,
  },
  earningsLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: riderTheme.colors.success,
  },
  otpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: riderTheme.colors.warningSoft,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: riderTheme.radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: riderTheme.colors.warning,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: riderTheme.colors.textSecondary,
  },
  otpValue: {
    fontSize: 18,
    fontWeight: '800',
    color: riderTheme.colors.warningDark,
    letterSpacing: 4,
  },
  markDeliveredButton: {
    backgroundColor: riderTheme.colors.success,
    paddingVertical: 14,
    borderRadius: riderTheme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    ...riderTheme.shadow.medium,
  },
  markDeliveredButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: riderTheme.colors.textInverse,
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
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.xl,
    padding: 20,
    ...riderTheme.shadow.large,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: riderTheme.colors.textPrimary,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: riderTheme.colors.border,
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRadius: riderTheme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 6,
    color: riderTheme.colors.textPrimary,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRadius: riderTheme.radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1.2,
    backgroundColor: riderTheme.colors.success,
    borderRadius: riderTheme.radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    ...riderTheme.shadow.medium,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.textInverse,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: riderTheme.colors.surface,
    borderWidth: 1.5,
    borderColor: riderTheme.colors.danger,
    paddingVertical: 12,
    borderRadius: riderTheme.radius.lg,
    alignItems: 'center',
  },
  rejectText: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.danger,
  },
  acceptButton: {
    flex: 1.5,
    backgroundColor: riderTheme.colors.primary,
    paddingVertical: 12,
    borderRadius: riderTheme.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...riderTheme.shadow.medium,
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '700',
    color: riderTheme.colors.textInverse,
  },
  primaryAction: {
    backgroundColor: riderTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: riderTheme.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...riderTheme.shadow.medium,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.textInverse,
    flex: 1,
    textAlign: 'center',
  },
  deliverAction: {
    backgroundColor: riderTheme.colors.success,
    paddingVertical: 14,
    borderRadius: riderTheme.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...riderTheme.shadow.medium,
  },
  deliverActionDisabled: {
    backgroundColor: riderTheme.colors.textMuted,
    opacity: 0.6,
  },
  deliverActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.textInverse,
  },
});

