/**
 * Order Card Component
 * Modern premium order card with gradient accents
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Home, Package, IndianRupee, Navigation, CheckCircle, Truck, Lock, ArrowRight, Camera, RotateCcw, QrCode, Banknote, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { RiderOrder } from '@/types';
import { StatusBadge } from './StatusBadge';
import { formatDistance, calculateDistance } from '@/utils/distance';
import { imageAPI, locationAPI, riderOrderAPI, riderPaymentAPI } from '@/lib/api';
import { riderTheme } from '@/theme/riderTheme';

function asFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const p = parseFloat(v);
    if (Number.isFinite(p)) return p;
  }
  return undefined;
}

/**
 * Job-card earnings breakdown.
 * Prefers revenue.riderRevenue (set after order CONFIRMED by the revenue calculator,
 * includes longDistanceBonus when distance > 6km). Falls back to calculate-fee
 * settlement, then legacy deliveryFee.
 */
function getJobCardRiderEarnings(order: RiderOrder): {
  total: number;
  settlement: number;
  bonus: number;
} {
  const rev = order.revenue?.riderRevenue;
  const revSettlement = asFiniteNumber(rev?.riderSettlementAmount);
  const revBonus = asFiniteNumber(rev?.longDistanceBonus);
  const revTotal = asFiniteNumber(rev?.finalPayout);
  if (revTotal !== undefined || revSettlement !== undefined) {
    const settlement = revSettlement ?? revTotal ?? 0;
    const bonus = revBonus ?? 0;
    const total = revTotal ?? settlement + bonus;
    return { total, settlement, bonus };
  }
  const feeSettlement = asFiniteNumber(order.calculatedFeeResponse?.riderSettlementAmount);
  if (feeSettlement !== undefined) return { total: feeSettlement, settlement: feeSettlement, bonus: 0 };
  const fee = asFiniteNumber(order.deliveryFee) ?? 0;
  return { total: fee, settlement: fee, bonus: 0 };
}

/** Amount only — rupee is shown by IndianRupee icon next to this text */
function formatJobEarningsRupees(amount: number): string {
  if (!Number.isFinite(amount)) return '0';
  const rounded = Math.round(amount * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
}

type UpiQrPayload = {
  paymentId: string;
  qrCodeId: string;
  imageUrl: string;
  closeBy: number;
  amount: number;
  amountRupees: number;
};

interface OrderCardProps {
  order: RiderOrder;
  onPress: () => void;
  onAccept?: () => void;
  onReject?: (reason?: string) => void;
  onStartPickupProcess?: () => void;
  onStartDelivery?: () => void;
  onMarkDelivered?: () => void;
  /** Required to record COD (UPI QR / cash) before delivery */
  riderId?: string;
  riderLocation?: { lat: number; lng: number };
}

export function OrderCard({ order, onPress, onAccept, onReject, onStartPickupProcess, onStartDelivery, onMarkDelivered, riderId, riderLocation }: OrderCardProps) {
  const isOffer = order.status === 'OFFERED_TO_RIDER';
  const isNewOrder = order.status === 'RIDER_ASSIGNED';
  const isPickedUp = order.status === 'PICKED_UP';
  const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
  const isCompleted = order.status === 'DELIVERED';
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpEntry, setOtpEntry] = useState('');
  const [packagePhotoUri, setPackagePhotoUri] = useState<string | null>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [hasStartedPickupProcess, setHasStartedPickupProcess] = useState(false);
  // Prevents double-tap on any async action button
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isConfirmingOtp, setIsConfirmingOtp] = useState(false);
  const [codCollectionModalVisible, setCodCollectionModalVisible] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState<UpiQrPayload | null>(null);
  const [qrRemainingSec, setQrRemainingSec] = useState(0);
  const [codCashBusy, setCodCashBusy] = useState(false);
  const [deliverStepBusy, setDeliverStepBusy] = useState(false);
  /** Shown under OTP title so riders know why UPI/cash was skipped (if applicable). */
  const [otpHelpText, setOtpHelpText] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearQrTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => () => clearQrTimers(), [clearQrTimers]);

  /** Wraps any async button callback with loading-gate: sets isActionLoading true,
   *  awaits the callback, then sets it false — no matter what. */
  const withActionLock = async (fn: () => Promise<void> | void) => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      await fn();
    } finally {
      setIsActionLoading(false);
    }
  };

  /** Pickup distance: backend road distance (POST /api/v1/location/distance), Haversine fallback on error */
  const [distanceToPickupKm, setDistanceToPickupKm] = useState<number | undefined>(undefined);
  const [distanceToPickupLoading, setDistanceToPickupLoading] = useState(false);

  useEffect(() => {
    if (!riderLocation || order.pickupLat == null || order.pickupLng == null) {
      setDistanceToPickupKm(undefined);
      setDistanceToPickupLoading(false);
      return;
    }

    let cancelled = false;
    const fallbackKm = () =>
      calculateDistance(
        riderLocation.lat,
        riderLocation.lng,
        order.pickupLat!,
        order.pickupLng!
      );

    setDistanceToPickupLoading(true);
    const debounceMs = 400;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await locationAPI.getDistance(
            riderLocation.lat,
            riderLocation.lng,
            order.pickupLat!,
            order.pickupLng!
          );
          const km =
            typeof res.distanceKm === 'number' && Number.isFinite(res.distanceKm)
              ? Math.round(res.distanceKm * 10) / 10
              : fallbackKm();
          if (!cancelled) setDistanceToPickupKm(km);
        } catch (e) {
          console.warn('[OrderCard] distance API failed, using Haversine', e);
          if (!cancelled) setDistanceToPickupKm(fallbackKm());
        } finally {
          if (!cancelled) setDistanceToPickupLoading(false);
        }
      })();
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setDistanceToPickupLoading(false);
    };
  }, [riderLocation?.lat, riderLocation?.lng, order.pickupLat, order.pickupLng]);

  const completeDelivery = async () => {
    if (!onMarkDelivered) return;
    setIsConfirmingOtp(true);
    try {
      await onMarkDelivered();
    } finally {
      setIsConfirmingOtp(false);
    }
  };

  /** Payment first (if COD pending), then delivery OTP, then mark delivered. */
  const beginMarkDeliveredFlow = async () => {
    if (deliverStepBusy || isConfirmingOtp || codCashBusy) return;
    const isCod = (order.paymentMethod || '').toUpperCase() === 'COD';
    if (!isCod) {
      setOtpHelpText(null);
      setOtpModalVisible(true);
      return;
    }
    if (!riderId) {
      Alert.alert('Error', 'Cannot complete delivery: rider session missing.');
      return;
    }
    setDeliverStepBusy(true);
    try {
      if (order.paymentId) {
        try {
          const p = await riderPaymentAPI.getPayment(order.paymentId);
          if (String(p.paymentStatus).toUpperCase() === 'SUCCESS') {
            setOtpHelpText(
              'COD is already marked paid in the system (customer confirmed in the app). No need to collect again — ask for the delivery OTP to complete handoff.'
            );
            setOtpModalVisible(true);
            return;
          }
        } catch {
          /* fall through to collect payment */
        }
      }
      setCodCollectionModalVisible(true);
    } finally {
      setDeliverStepBusy(false);
    }
  };

  const closeQrModal = () => {
    clearQrTimers();
    setQrOpen(false);
    setQrPayload(null);
  };

  const openUpiQr = async () => {
    if (!riderId) {
      Alert.alert('Error', 'Cannot load UPI QR: rider session missing.');
      return;
    }
    try {
      const data = await riderOrderAPI.createUpiQr(riderId, order.orderId);
      setQrPayload(data);
      setQrOpen(true);
      clearQrTimers();

      const tick = () => {
        const left = Math.max(0, data.closeBy - Math.floor(Date.now() / 1000));
        setQrRemainingSec(left);
        if (left <= 0) {
          clearQrTimers();
        }
      };
      tick();
      tickRef.current = setInterval(tick, 1000);

      pollRef.current = setInterval(() => {
        void (async () => {
          try {
            const p = await riderPaymentAPI.getPayment(data.paymentId);
            if (String(p.paymentStatus).toUpperCase() === 'SUCCESS') {
              clearQrTimers();
              setQrOpen(false);
              setQrPayload(null);
              setCodCollectionModalVisible(false);
              setOtpHelpText('UPI payment recorded. Enter the delivery OTP from the customer.');
              setOtpModalVisible(true);
            }
          } catch {
            /* ignore transient poll errors */
          }
        })();
      }, 2500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load QR';
      Alert.alert('UPI QR', msg);
    }
  };

  const handleCodPaidCash = async () => {
    if (!riderId) {
      Alert.alert('Error', 'Cannot record cash: rider session missing.');
      return;
    }
    setCodCashBusy(true);
    try {
      await riderOrderAPI.markCashCollected(riderId, order.orderId);
      setCodCollectionModalVisible(false);
      setOtpHelpText('Cash payment recorded. Enter the delivery OTP from the customer.');
      setOtpModalVisible(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not record cash';
      Alert.alert('Cash payment', msg);
    } finally {
      setCodCashBusy(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (isConfirmingOtp) return;
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
    setOtpHelpText(null);

    if (!onMarkDelivered) return;
    await completeDelivery();
  };

  const takePackagePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission', 'Camera access is required to take a package photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPackagePhotoUri(result.assets[0].uri);
    }
  };

  const handleMarkPickedUp = async () => {
    if (!packagePhotoUri || !onAccept) return;
    setIsUploadingEvidence(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(packagePhotoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await imageAPI.uploadPackageEvidence(order.orderId, `data:image/jpeg;base64,${base64}`);
      onAccept();
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Could not upload package photo. Please try again.');
    } finally {
      setIsUploadingEvidence(false);
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
    <>
    <TouchableOpacity
      style={[styles.card, getCardStyle()]}
      onPress={isCompleted ? undefined : onPress}
      disabled={isCompleted}
      activeOpacity={isCompleted ? 1 : 0.85}
    >
      {/* Header with Order ID & Status */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.orderLabel}>Order ID</Text>
          <Text style={styles.orderId} selectable>
            {order.orderId}
          </Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      {(order.paymentMethod || '').toUpperCase() === 'COD' && (
        <View style={styles.codBanner}>
          <Text style={styles.codBannerTitle}>Cash on delivery</Text>
          <Text style={styles.codBannerAmount}>Collect ₹{Number(order.grandTotal).toFixed(0)} from customer</Text>
        </View>
      )}

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
          {riderLocation && order.pickupLat != null && order.pickupLng != null && (
            <View style={styles.distanceBadge}>
              <Navigation size={11} color={riderTheme.colors.success} strokeWidth={2.5} />
              {distanceToPickupLoading ? (
                <ActivityIndicator size="small" color={riderTheme.colors.success} style={styles.distanceSpinner} />
              ) : distanceToPickupKm !== undefined ? (
                <Text style={styles.distanceText}>{formatDistance(distanceToPickupKm)}</Text>
              ) : null}
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
      {(() => {
        const earnings = getJobCardRiderEarnings(order);
        const hasBonus = earnings.bonus > 0;
        return (
          <View style={styles.detailsRow}>
            <View style={styles.detailChip}>
              <Package size={16} color={riderTheme.colors.primary} strokeWidth={2.5} />
              <Text style={styles.detailText}>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</Text>
            </View>
            <View style={styles.earningsChip}>
              <IndianRupee size={16} color={riderTheme.colors.success} strokeWidth={2.5} />
              <Text style={styles.earningsText}>{formatJobEarningsRupees(earnings.total)}</Text>
              <Text style={styles.earningsLabel}>{hasBonus ? 'total' : 'earnings'}</Text>
            </View>
          </View>
        );
      })()}

      {/* Earnings breakdown: fee + long-distance bonus (only when bonus present) */}
      {(() => {
        const earnings = getJobCardRiderEarnings(order);
        if (earnings.bonus <= 0) return null;
        return (
          <View style={styles.earningsBreakdownRow}>
            <Text style={styles.earningsBreakdownText}>
              Fee ₹{formatJobEarningsRupees(earnings.settlement)} + Bonus ₹{formatJobEarningsRupees(earnings.bonus)}
            </Text>
          </View>
        );
      })()}

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
            style={[styles.rejectButton, isActionLoading && { opacity: 0.5 }]}
            onPress={(e) => { e.stopPropagation(); void withActionLock(() => onReject!('Dude rejected')); }}
            disabled={isActionLoading}
            activeOpacity={0.85}
          >
            {isActionLoading ? (
              <ActivityIndicator size="small" color={riderTheme.colors.danger} />
            ) : (
              <Text style={styles.rejectText}>Reject</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptButton, isActionLoading && { opacity: 0.5 }]}
            onPress={(e) => { e.stopPropagation(); void withActionLock(() => onAccept!()); }}
            disabled={isActionLoading}
            activeOpacity={0.85}
          >
            {isActionLoading ? (
              <ActivityIndicator size="small" color={riderTheme.colors.textInverse} />
            ) : (
              <CheckCircle size={18} color={riderTheme.colors.textInverse} strokeWidth={2.5} />
            )}
            <Text style={styles.acceptText}>{isActionLoading ? 'Processing...' : 'Accept Order'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isNewOrder && onAccept && (
        <View style={styles.pickupEvidenceSection}>
          {!hasStartedPickupProcess ? (
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={(e) => {
                e.stopPropagation();
                setHasStartedPickupProcess(true);
                onStartPickupProcess?.();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionText}>Start Delivery Process</Text>
            </TouchableOpacity>
          ) : !packagePhotoUri ? (
            <TouchableOpacity
              style={styles.takePhotoButton}
              onPress={(e) => { e.stopPropagation(); takePackagePhoto(); }}
              activeOpacity={0.85}
            >
              <Camera size={20} color={riderTheme.colors.primary} strokeWidth={2.5} />
              <Text style={styles.takePhotoText}>Take Package Photo</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: packagePhotoUri }} style={styles.photoThumbnail} />
                <View style={styles.photoPreviewInfo}>
                  <Text style={styles.photoPreviewLabel}>Package photo captured</Text>
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={(e) => { e.stopPropagation(); takePackagePhoto(); }}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={14} color={riderTheme.colors.warning} strokeWidth={2.5} />
                    <Text style={styles.retakeText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.primaryAction, isUploadingEvidence && { opacity: 0.6 }]}
                onPress={(e) => { e.stopPropagation(); handleMarkPickedUp(); }}
                disabled={isUploadingEvidence}
                activeOpacity={0.85}
              >
                {isUploadingEvidence ? (
                  <ActivityIndicator size="small" color={riderTheme.colors.textInverse} />
                ) : (
                  <CheckCircle size={18} color={riderTheme.colors.textInverse} strokeWidth={2.5} />
                )}
                <Text style={styles.primaryActionText}>
                  {isUploadingEvidence ? 'Uploading...' : 'Mark as Picked Up'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {isPickedUp && onStartDelivery && (
        <TouchableOpacity
          style={[styles.primaryAction, isActionLoading && { opacity: 0.6 }]}
          onPress={(e) => { e.stopPropagation(); void withActionLock(() => onStartDelivery!()); }}
          disabled={isActionLoading}
          activeOpacity={0.85}
        >
          {isActionLoading ? (
            <ActivityIndicator size="small" color={riderTheme.colors.textInverse} />
          ) : (
            <Truck size={20} color={riderTheme.colors.textInverse} strokeWidth={2.5} />
          )}
          <Text style={styles.primaryActionText}>{isActionLoading ? 'Starting...' : 'Start Delivery'}</Text>
          {!isActionLoading && <ArrowRight size={18} color={riderTheme.colors.textInverse} strokeWidth={2.5} />}
        </TouchableOpacity>
      )}

      {isOutForDelivery && onMarkDelivered && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            void beginMarkDeliveredFlow();
          }}
          style={[
            styles.markDeliveredButton,
            (isConfirmingOtp || codCashBusy || deliverStepBusy) && { opacity: 0.6 },
          ]}
          disabled={isConfirmingOtp || codCashBusy || deliverStepBusy}
          activeOpacity={0.8}
        >
          {isConfirmingOtp || codCashBusy || deliverStepBusy ? (
            <ActivityIndicator size="small" color={riderTheme.colors.textInverse} />
          ) : (
            <CheckCircle size={18} color={riderTheme.colors.textInverse} />
          )}
          <Text style={styles.markDeliveredButtonText}>
            {isConfirmingOtp || codCashBusy
              ? 'DELIVERING...'
              : deliverStepBusy
                ? 'PLEASE WAIT...'
                : 'MARK AS DELIVERED'}
          </Text>
        </TouchableOpacity>
      )}

    </TouchableOpacity>

      <Modal
        visible={otpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setOtpModalVisible(false);
          setOtpHelpText(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delivery OTP (final step)</Text>
            {otpHelpText ? <Text style={styles.modalHelpText}>{otpHelpText}</Text> : null}
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
                  setOtpHelpText(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, isConfirmingOtp && { opacity: 0.6 }]}
                onPress={() => void handleConfirmOtp()}
                disabled={isConfirmingOtp}
                activeOpacity={0.8}
              >
                {isConfirmingOtp ? (
                  <ActivityIndicator size="small" color={riderTheme.colors.textInverse} style={{ marginRight: 6 }} />
                ) : null}
                <Text style={styles.modalConfirmText}>{isConfirmingOtp ? 'Delivering...' : 'Verify & Deliver'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={codCollectionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCodCollectionModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Collect payment</Text>
            <Text style={styles.codModalSubtitle}>
              Customer chose COD. Collect ₹{Number(order.grandTotal).toFixed(0)} via UPI QR or cash. You will enter the delivery OTP after payment is recorded.
            </Text>
            <View style={styles.codPayRow}>
              <TouchableOpacity style={styles.codQrButton} onPress={() => void openUpiQr()} activeOpacity={0.88}>
                <QrCode size={20} color={riderTheme.colors.primary} />
                <Text style={styles.codQrButtonText}>UPI QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.codCashButton}
                onPress={() => void handleCodPaidCash()}
                disabled={codCashBusy}
                activeOpacity={0.88}
              >
                <Banknote size={20} color={riderTheme.colors.success} />
                <Text style={styles.codCashButtonText}>{codCashBusy ? 'Saving…' : 'Paid in cash'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalCancelButtonWide}
              onPress={() => setCodCollectionModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={qrOpen} animationType="slide" onRequestClose={closeQrModal}>
        <SafeAreaView style={styles.qrModalRoot}>
          <View style={styles.qrModalHeader}>
            <Text style={styles.qrModalTitle}>Scan to pay (UPI)</Text>
            <Pressable onPress={closeQrModal} hitSlop={12} accessibilityRole="button">
              <X size={26} color={riderTheme.colors.textPrimary} />
            </Pressable>
          </View>
          {qrPayload ? (
            <>
              <Text style={styles.qrAmount}>₹{Number(qrPayload.amountRupees).toFixed(0)}</Text>
              <Text style={styles.qrExpiry}>
                {qrRemainingSec > 0
                  ? `Expires in ${Math.floor(qrRemainingSec / 60)}m ${qrRemainingSec % 60}s`
                  : 'QR expired — close and open again'}
              </Text>
              <View style={styles.qrImageWrap}>
                <Image source={{ uri: qrPayload.imageUrl }} style={styles.qrImage} resizeMode="contain" />
              </View>
              <Text style={styles.qrHint}>Wait here until payment confirms automatically.</Text>
            </>
          ) : (
            <ActivityIndicator size="large" color={riderTheme.colors.primary} style={{ marginTop: 40 }} />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
/** Modal QR frame: nearly full width, larger minimum for easier customer scanning */
const QR_FRAME = Math.round(Math.min(440, Math.max(304, SCREEN_WIDTH - 44)));
const QR_INNER = QR_FRAME + 220;

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
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: riderTheme.colors.borderLight,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  codBanner: {
    marginTop: -6,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: riderTheme.radius.md,
    backgroundColor: riderTheme.colors.warningSoft,
    borderWidth: 1,
    borderColor: riderTheme.colors.warning,
  },
  codBannerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: riderTheme.colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  codBannerAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: riderTheme.colors.textPrimary,
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
    letterSpacing: 0.2,
    flexShrink: 1,
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
  distanceSpinner: {
    transform: [{ scale: 0.75 }],
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
  earningsBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  earningsBreakdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: riderTheme.colors.textSecondary,
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
  modalHelpText: {
    fontSize: 13,
    fontWeight: '500',
    color: riderTheme.colors.textSecondary,
    lineHeight: 19,
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
  codModalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: riderTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  codPayRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  codQrButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: riderTheme.radius.lg,
    borderWidth: 2,
    borderColor: riderTheme.colors.primary,
    backgroundColor: riderTheme.colors.surface,
  },
  codQrButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: riderTheme.colors.primary,
  },
  codCashButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: riderTheme.radius.lg,
    borderWidth: 2,
    borderColor: riderTheme.colors.success,
    backgroundColor: riderTheme.colors.surface,
  },
  codCashButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: riderTheme.colors.successDark,
  },
  modalCancelButtonWide: {
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRadius: riderTheme.radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  qrModalRoot: {
    flex: 1,
    backgroundColor: riderTheme.colors.background,
    paddingHorizontal: 20,
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: riderTheme.colors.textPrimary,
  },
  qrAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: riderTheme.colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  qrExpiry: {
    fontSize: 14,
    fontWeight: '600',
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  qrImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: riderTheme.colors.surface,
    borderRadius: riderTheme.radius.xl,
    padding: 0,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
    alignSelf: 'center',
    width: QR_FRAME,
  },
  qrImage: {
    width: QR_INNER,
    height: QR_INNER,
  },
  qrHint: {
    fontSize: 14,
    color: riderTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
    paddingHorizontal: 12,
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
  pickupEvidenceSection: {
    gap: 10,
  },
  takePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: riderTheme.radius.lg,
    borderWidth: 1.5,
    borderColor: riderTheme.colors.primary,
    borderStyle: 'dashed',
    backgroundColor: riderTheme.colors.primarySoft,
  },
  takePhotoText: {
    fontSize: 14,
    fontWeight: '700',
    color: riderTheme.colors.primary,
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: riderTheme.colors.surfaceMuted,
    borderRadius: riderTheme.radius.lg,
    borderWidth: 1,
    borderColor: riderTheme.colors.borderLight,
  },
  photoThumbnail: {
    width: 56,
    height: 56,
    borderRadius: riderTheme.radius.md,
  },
  photoPreviewInfo: {
    flex: 1,
    gap: 6,
  },
  photoPreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: riderTheme.colors.textPrimary,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '700',
    color: riderTheme.colors.warning,
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
