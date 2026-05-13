/**
 * Orders Context for Rider App
 * Manages rider's assigned orders
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { riderOrderAPI, riderAuthAPI } from '@/lib/api';
import { RiderOrder } from '@/types';
import { useAuth } from './AuthContext';
import { useLocation } from './LocationContext';
import { startNewOrderAlert, stopNewOrderAlert, unloadNewOrderAlert } from '@/services/order-alert';
import { muteRiderRideAlert, stopRiderRideAlert, startRiderRideAlert, muteAllRiderAlerts } from '@/services/rider-floating-service';

interface OrdersContextType {
  orders: RiderOrder[];
  activeOrders: RiderOrder[];
  completedOrders: RiderOrder[];
  ringingOrderIds: string[];
  riderRating: number | null;
  riderRatedCount: number;
  isLoading: boolean;
  isLoadingCompleted: boolean;
  refreshOrders: (force?: boolean) => Promise<void>;
  refreshCompletedOrders: () => Promise<void>;
  acceptOrder: (orderId: string, status: string) => Promise<void>;
  rejectOrder: (orderId: string, reason: string) => Promise<void>;
  dismissOrderAlert: (orderId: string) => Promise<void>;
  muteOrderAlert: (orderId: string) => Promise<void>;
  muteAllAlerts: () => Promise<void>;
  markOrderAlerting: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: string, otp?: string) => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);
const ALERT_SUPPRESSION_MS = 20_000;

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { rider, isLoggedIn } = useAuth();
  const { isOnline } = useLocation();
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [completedOrdersList, setCompletedOrdersList] = useState<RiderOrder[]>([]);
  const [ringingOrderIds, setRingingOrderIds] = useState<string[]>([]);
  const [riderRating, setRiderRating] = useState<number | null>(null);
  const [riderRatedCount, setRiderRatedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const alertingOrderIdsRef = useRef<Set<string>>(new Set());
  const alertedOrderIdsRef = useRef<Set<string>>(new Set());
  const forceAssignedAlertingIdsRef = useRef<Set<string>>(new Set());
  const everOfferedOrderIdsRef = useRef<Set<string>>(new Set());
  const hasFetchedOrdersRef = useRef(false);
  const suppressedAlertOrderIdsRef = useRef<Map<string, number>>(new Map());
  const mutedAlertOrderIdsRef = useRef<Set<string>>(new Set());

  const syncRingingOrderIdsState = useCallback((orderIds?: Iterable<string>) => {
    setRingingOrderIds(orderIds ? [...orderIds] : [...alertingOrderIdsRef.current]);
  }, []);

  const syncAlertPlayback = useCallback(async () => {
    if (alertingOrderIdsRef.current.size > 0) {
      await startNewOrderAlert();
      return;
    }

    await stopNewOrderAlert();
  }, []);

  const clearAlertForOrder = useCallback(async (orderId: string) => {
    // Always stop the native ride alert for this order — the order may have
    // been alerted via FCM (which doesn't touch alertingOrderIdsRef) so we
    // can't gate this on the local set membership.
    stopRiderRideAlert(orderId);

    forceAssignedAlertingIdsRef.current.delete(orderId);

    if (!alertingOrderIdsRef.current.delete(orderId)) {
      // If neither set had this order, nothing more to do
      if (!forceAssignedAlertingIdsRef.current.size) {
        syncRingingOrderIdsState();
      }
      return;
    }

    syncRingingOrderIdsState();
    await syncAlertPlayback();
  }, [syncAlertPlayback, syncRingingOrderIdsState]);

  const suppressOrderAlert = useCallback((orderId: string) => {
    suppressedAlertOrderIdsRef.current.set(orderId, Date.now() + ALERT_SUPPRESSION_MS);
    stopRiderRideAlert(orderId);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !rider) {
      knownOrderIdsRef.current = new Set();
      alertingOrderIdsRef.current = new Set();
      alertedOrderIdsRef.current = new Set();
      forceAssignedAlertingIdsRef.current = new Set();
      everOfferedOrderIdsRef.current = new Set();
      suppressedAlertOrderIdsRef.current = new Map();
      mutedAlertOrderIdsRef.current = new Set();
      hasFetchedOrdersRef.current = false;
      setRingingOrderIds([]);
      stopNewOrderAlert().catch(() => undefined);
    }
  }, [isLoggedIn, rider]);

  useEffect(() => {
    return () => {
      unloadNewOrderAlert().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn && rider && isOnline) {
      console.log('🔄 Rider is online, starting order polling');
      refreshOrders();
      
      // Auto-refresh every 30 seconds only when rider is online
      const interval = setInterval(refreshOrders, 30000);
      return () => {
        console.log('⏸️ Stopping order polling (rider offline or logged out)');
        clearInterval(interval);
      };
    } else {
      console.log('⏸️ Order polling disabled - rider offline or logged out');
    }
  }, [isLoggedIn, rider, isOnline]);

  const refreshOrders = useCallback(async (force: boolean = false) => {
    if (!rider) return;
    
    // Don't fetch orders if rider is offline unless forced (pull-to-refresh)
    if (!isOnline && !force) {
      console.log('⏸️ Skipping order fetch - rider is offline');
      return;
    }

    setIsLoading(true);
    try {
      const now = Date.now();
      for (const [orderId, expiresAt] of [...suppressedAlertOrderIdsRef.current.entries()]) {
        if (expiresAt <= now) {
          suppressedAlertOrderIdsRef.current.delete(orderId);
        }
      }

      // Fetch active orders and rider rating in parallel (rating from dedicated API)
      const [offeredResponse, riderAssignedResponse, pickedUpResponse, outForDeliveryResponse, ratingResponse] = await Promise.all([
        riderOrderAPI.getOrders(rider.riderId, 'OFFERED_TO_RIDER'),
        riderOrderAPI.getOrders(rider.riderId, 'RIDER_ASSIGNED'),
        riderOrderAPI.getOrders(rider.riderId, 'PICKED_UP'),
        riderOrderAPI.getOrders(rider.riderId, 'OUT_FOR_DELIVERY'),
        riderAuthAPI.getRating(rider.riderId).catch(() => ({ riderRating: null, riderRatedCount: 0 })),
      ]);
      
      const allActiveOrders = [
        ...offeredResponse.orders,
        ...riderAssignedResponse.orders,
        ...pickedUpResponse.orders,
        ...outForDeliveryResponse.orders
      ];

      const currentAlertableOrderIds = new Set(
        allActiveOrders
          .filter((order) => order.status === 'OFFERED_TO_RIDER')
          .filter((order) => !suppressedAlertOrderIdsRef.current.has(order.orderId))
          .filter((order) => !mutedAlertOrderIdsRef.current.has(order.orderId))
          .map((order) => order.orderId)
      );

      // Track all orders ever seen as OFFERED_TO_RIDER so we can distinguish accepted from force-assigned
      for (const order of offeredResponse.orders) {
        everOfferedOrderIdsRef.current.add(order.orderId);
      }

      for (const order of allActiveOrders) {
        if (order.status !== 'OFFERED_TO_RIDER') {
          suppressedAlertOrderIdsRef.current.delete(order.orderId);
        }
      }

      // Detect force-assigned orders: new RIDER_ASSIGNED that were never offered
      if (hasFetchedOrdersRef.current) {
        for (const order of riderAssignedResponse.orders) {
          const orderId = order.orderId;
          if (
            !knownOrderIdsRef.current.has(orderId) &&
            !everOfferedOrderIdsRef.current.has(orderId) &&
            !alertedOrderIdsRef.current.has(orderId) &&
            !suppressedAlertOrderIdsRef.current.has(orderId) &&
            !mutedAlertOrderIdsRef.current.has(orderId) &&
            !forceAssignedAlertingIdsRef.current.has(orderId)
          ) {
            // Force-assigned by admin — start looping alert via native service
            alertedOrderIdsRef.current.add(orderId);
            forceAssignedAlertingIdsRef.current.add(orderId);
            startRiderRideAlert(
              orderId,
              (order as any).restaurantName || 'Nearby restaurant',
              (order as any).deliveryFee || 0,
            );
          }
        }
      }

      // Clean up force-assigned alerting set for orders no longer RIDER_ASSIGNED
      const currentRiderAssignedIds = new Set(riderAssignedResponse.orders.map((o) => o.orderId));
      for (const orderId of [...forceAssignedAlertingIdsRef.current]) {
        if (!currentRiderAssignedIds.has(orderId)) {
          forceAssignedAlertingIdsRef.current.delete(orderId);
          stopRiderRideAlert(orderId);
        }
      }

      const incomingAlertOrders = allActiveOrders.filter(
        (order) =>
          currentAlertableOrderIds.has(order.orderId) &&
          !knownOrderIdsRef.current.has(order.orderId) &&
          !alertedOrderIdsRef.current.has(order.orderId)
      );
      
      setOrders(allActiveOrders);
      const rating = ratingResponse.riderRating != null && Number.isFinite(ratingResponse.riderRating) ? ratingResponse.riderRating : null;
      const count = Number.isFinite(ratingResponse.riderRatedCount) ? ratingResponse.riderRatedCount : 0;
      setRiderRating(rating);
      setRiderRatedCount(count);

      if (hasFetchedOrdersRef.current) {
        for (const order of incomingAlertOrders) {
          alertedOrderIdsRef.current.add(order.orderId);
          alertingOrderIdsRef.current.add(order.orderId);
        }
      } else {
        alertingOrderIdsRef.current = new Set(
          [...alertingOrderIdsRef.current].filter((orderId) => currentAlertableOrderIds.has(orderId))
        );
      }

      // Detect orders that *were* alerting but the server says are no longer
      // pending (rider accepted/rejected on another device, or the offer
      // expired). Silence their native rings instantly instead of waiting up
      // to 30 s for the :location process's own poll to catch up.
      const droppedAlertOrderIds = [...alertingOrderIdsRef.current].filter(
        (orderId) => !currentAlertableOrderIds.has(orderId),
      );
      for (const orderId of droppedAlertOrderIds) {
        stopRiderRideAlert(orderId);
      }

      alertingOrderIdsRef.current = new Set(
        [...alertingOrderIdsRef.current].filter((orderId) => currentAlertableOrderIds.has(orderId))
      );

      const visibleRingingOrderIds = new Set([
        ...alertingOrderIdsRef.current,
        ...currentAlertableOrderIds,
        ...forceAssignedAlertingIdsRef.current,
      ]);
      syncRingingOrderIdsState(visibleRingingOrderIds);
      await syncAlertPlayback();
      knownOrderIdsRef.current = new Set(allActiveOrders.map((order) => order.orderId));
      hasFetchedOrdersRef.current = true;
      console.log(`📦 Fetched ${allActiveOrders.length} active orders for rider; rating=${rating}, count=${count}`);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [rider, isOnline, syncAlertPlayback, syncRingingOrderIdsState]);

  const acceptOrder = useCallback(async (orderId: string, status: string) => {
    if (!rider) return;

    try {
      suppressOrderAlert(orderId);
      mutedAlertOrderIdsRef.current.add(orderId);
      muteRiderRideAlert(orderId);
      await riderOrderAPI.acceptOrder(rider.riderId, orderId, status);
      await clearAlertForOrder(orderId);
      await refreshOrders();
      console.log(`✅ Order ${orderId} accepted`);
    } catch (error) {
      console.error('Failed to accept order:', error);
      throw error;
    }
  }, [rider, clearAlertForOrder, refreshOrders, suppressOrderAlert]);

  const rejectOrder = useCallback(async (orderId: string, reason: string) => {
    if (!rider) return;

    try {
      suppressOrderAlert(orderId);
      mutedAlertOrderIdsRef.current.add(orderId);
      muteRiderRideAlert(orderId);
      await riderOrderAPI.rejectOrder(rider.riderId, orderId, reason);
      await clearAlertForOrder(orderId);
      await refreshOrders();
      console.log(`❌ Order ${orderId} rejected`);
    } catch (error) {
      console.error('Failed to reject order:', error);
      throw error;
    }
  }, [rider, clearAlertForOrder, refreshOrders, suppressOrderAlert]);

  const dismissOrderAlert = useCallback(async (orderId: string) => {
    await clearAlertForOrder(orderId);
  }, [clearAlertForOrder]);

  const muteOrderAlert = useCallback(async (orderId: string) => {
    mutedAlertOrderIdsRef.current.add(orderId);
    forceAssignedAlertingIdsRef.current.delete(orderId);
    muteRiderRideAlert(orderId);
    await clearAlertForOrder(orderId);
  }, [clearAlertForOrder]);

  const muteAllAlerts = useCallback(async () => {
    // Mute every currently ringing order in native service (stops looping MediaPlayer + marks muted)
    muteAllRiderAlerts();
    // Stop in-app expo-av ring
    await stopNewOrderAlert();
    // Mute all in local tracking sets
    for (const orderId of alertingOrderIdsRef.current) {
      mutedAlertOrderIdsRef.current.add(orderId);
    }
    for (const orderId of forceAssignedAlertingIdsRef.current) {
      mutedAlertOrderIdsRef.current.add(orderId);
    }
    alertingOrderIdsRef.current.clear();
    forceAssignedAlertingIdsRef.current.clear();
    setRingingOrderIds([]);
  }, []);

  const markOrderAlerting = useCallback((orderId: string) => {
    if (!orderId) return;
    if (suppressedAlertOrderIdsRef.current.has(orderId)) return;
    if (mutedAlertOrderIdsRef.current.has(orderId)) return;
    if (alertedOrderIdsRef.current.has(orderId)) return;

    alertedOrderIdsRef.current.add(orderId);
    alertingOrderIdsRef.current.add(orderId);
    syncRingingOrderIdsState();
  }, [syncRingingOrderIdsState]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string, otp?: string) => {
    if (!rider) return;

    try {
      await riderOrderAPI.updateOrderStatus(rider.riderId, orderId, status, otp);
      await refreshOrders();
      // If marking as delivered, also refresh completed orders
      if (status === 'DELIVERED') {
        await refreshCompletedOrders();
      }
      console.log(`📝 Order ${orderId} status updated to ${status}`);
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  }, [rider, refreshOrders]);

  const refreshCompletedOrders = useCallback(async () => {
    if (!rider) return;

    setIsLoadingCompleted(true);
    try {
      const response = await riderOrderAPI.getOrders(rider.riderId, 'DELIVERED');
      setCompletedOrdersList(response.orders);
      const ratingRes = await riderAuthAPI.getRating(rider.riderId).catch(() => ({ riderRating: null, riderRatedCount: 0 }));
      setRiderRating(ratingRes.riderRating != null && Number.isFinite(ratingRes.riderRating) ? ratingRes.riderRating : null);
      setRiderRatedCount(Number.isFinite(ratingRes.riderRatedCount) ? ratingRes.riderRatedCount : 0);
      console.log(`✅ Fetched ${response.orders.length} completed orders for rider`);
    } catch (error) {
      console.error('Failed to fetch completed orders:', error);
    } finally {
      setIsLoadingCompleted(false);
    }
  }, [rider]);

  const activeOrders = orders.filter(
    (o) => ['OFFERED_TO_RIDER', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.status)
  );

  const completedOrders = completedOrdersList;

  return (
    <OrdersContext.Provider
      value={{
        orders,
        activeOrders,
        completedOrders,
        ringingOrderIds,
        riderRating,
        riderRatedCount,
        isLoading,
        isLoadingCompleted,
        refreshOrders,
        refreshCompletedOrders,
        acceptOrder,
        rejectOrder,
        dismissOrderAlert,
        muteOrderAlert,
        muteAllAlerts,
        markOrderAlerting,
        updateOrderStatus,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
}
