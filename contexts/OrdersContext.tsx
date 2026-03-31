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

interface OrdersContextType {
  orders: RiderOrder[];
  activeOrders: RiderOrder[];
  completedOrders: RiderOrder[];
  riderRating: number | null;
  riderRatedCount: number;
  isLoading: boolean;
  isLoadingCompleted: boolean;
  refreshOrders: (force?: boolean) => Promise<void>;
  refreshCompletedOrders: () => Promise<void>;
  acceptOrder: (orderId: string, status: string) => Promise<void>;
  rejectOrder: (orderId: string, reason: string) => Promise<void>;
  dismissOrderAlert: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string, otp?: string) => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { rider, isLoggedIn } = useAuth();
  const { isOnline } = useLocation();
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [completedOrdersList, setCompletedOrdersList] = useState<RiderOrder[]>([]);
  const [riderRating, setRiderRating] = useState<number | null>(null);
  const [riderRatedCount, setRiderRatedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const alertingOrderIdsRef = useRef<Set<string>>(new Set());
  const hasFetchedOrdersRef = useRef(false);

  const syncAlertPlayback = useCallback(async () => {
    if (alertingOrderIdsRef.current.size > 0) {
      await startNewOrderAlert();
      return;
    }

    await stopNewOrderAlert();
  }, []);

  const clearAlertForOrder = useCallback(async (orderId: string) => {
    if (!alertingOrderIdsRef.current.delete(orderId)) {
      return;
    }

    await syncAlertPlayback();
  }, [syncAlertPlayback]);

  useEffect(() => {
    if (!isLoggedIn || !rider) {
      knownOrderIdsRef.current = new Set();
      alertingOrderIdsRef.current = new Set();
      hasFetchedOrdersRef.current = false;
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
          .filter((order) => ['OFFERED_TO_RIDER', 'RIDER_ASSIGNED'].includes(order.status))
          .map((order) => order.orderId)
      );

      const incomingAlertOrders = allActiveOrders.filter(
        (order) =>
          currentAlertableOrderIds.has(order.orderId) &&
          !knownOrderIdsRef.current.has(order.orderId)
      );
      
      setOrders(allActiveOrders);
      const rating = ratingResponse.riderRating != null && Number.isFinite(ratingResponse.riderRating) ? ratingResponse.riderRating : null;
      const count = Number.isFinite(ratingResponse.riderRatedCount) ? ratingResponse.riderRatedCount : 0;
      setRiderRating(rating);
      setRiderRatedCount(count);

      if (hasFetchedOrdersRef.current) {
        for (const order of incomingAlertOrders) {
          alertingOrderIdsRef.current.add(order.orderId);
        }
      } else {
        alertingOrderIdsRef.current = new Set(
          [...alertingOrderIdsRef.current].filter((orderId) => currentAlertableOrderIds.has(orderId))
        );
      }

      alertingOrderIdsRef.current = new Set(
        [...alertingOrderIdsRef.current].filter((orderId) => currentAlertableOrderIds.has(orderId))
      );

      await syncAlertPlayback();
      knownOrderIdsRef.current = new Set(allActiveOrders.map((order) => order.orderId));
      hasFetchedOrdersRef.current = true;
      console.log(`📦 Fetched ${allActiveOrders.length} active orders for rider; rating=${rating}, count=${count}`);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [rider, isOnline]);

  const acceptOrder = useCallback(async (orderId: string, status: string) => {
    if (!rider) return;

    try {
      await riderOrderAPI.acceptOrder(rider.riderId, orderId, status);
      await clearAlertForOrder(orderId);
      await refreshOrders();
      console.log(`✅ Order ${orderId} accepted`);
    } catch (error) {
      console.error('Failed to accept order:', error);
      throw error;
    }
  }, [rider, clearAlertForOrder, refreshOrders]);

  const rejectOrder = useCallback(async (orderId: string, reason: string) => {
    if (!rider) return;

    try {
      await riderOrderAPI.rejectOrder(rider.riderId, orderId, reason);
      await clearAlertForOrder(orderId);
      await refreshOrders();
      console.log(`❌ Order ${orderId} rejected`);
    } catch (error) {
      console.error('Failed to reject order:', error);
      throw error;
    }
  }, [rider, clearAlertForOrder, refreshOrders]);

  const dismissOrderAlert = useCallback(async (orderId: string) => {
    await clearAlertForOrder(orderId);
  }, [clearAlertForOrder]);

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
        riderRating,
        riderRatedCount,
        isLoading,
        isLoadingCompleted,
        refreshOrders,
        refreshCompletedOrders,
        acceptOrder,
        rejectOrder,
        dismissOrderAlert,
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
