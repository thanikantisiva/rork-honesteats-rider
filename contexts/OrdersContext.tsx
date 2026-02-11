/**
 * Orders Context for Rider App
 * Manages rider's assigned orders
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { riderOrderAPI } from '@/lib/api';
import { RiderOrder } from '@/types';
import { useAuth } from './AuthContext';
import { useLocation } from './LocationContext';

interface OrdersContextType {
  orders: RiderOrder[];
  activeOrders: RiderOrder[];
  completedOrders: RiderOrder[];
  isLoading: boolean;
  isLoadingCompleted: boolean;
  refreshOrders: (force?: boolean) => Promise<void>;
  refreshCompletedOrders: () => Promise<void>;
  acceptOrder: (orderId: string, status: string) => Promise<void>;
  rejectOrder: (orderId: string, reason: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string, otp?: string) => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { rider, isLoggedIn } = useAuth();
  const { isOnline } = useLocation();
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [completedOrdersList, setCompletedOrdersList] = useState<RiderOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);

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
      // Fetch only active orders (RIDER_ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY)
      // This is optimized - doesn't fetch completed orders on every refresh
      const [offeredResponse, riderAssignedResponse, pickedUpResponse, outForDeliveryResponse] = await Promise.all([
        riderOrderAPI.getOrders(rider.riderId, 'OFFERED_TO_RIDER'),
        riderOrderAPI.getOrders(rider.riderId, 'RIDER_ASSIGNED'),
        riderOrderAPI.getOrders(rider.riderId, 'PICKED_UP'),
        riderOrderAPI.getOrders(rider.riderId, 'OUT_FOR_DELIVERY')
      ]);
      
      const allActiveOrders = [
        ...offeredResponse.orders,
        ...riderAssignedResponse.orders,
        ...pickedUpResponse.orders,
        ...outForDeliveryResponse.orders
      ];
      
      setOrders(allActiveOrders);
      console.log(`📦 Fetched ${allActiveOrders.length} active orders for rider`);
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
      await refreshOrders();
      console.log(`✅ Order ${orderId} accepted`);
    } catch (error) {
      console.error('Failed to accept order:', error);
      throw error;
    }
  }, [rider, refreshOrders]);

  const rejectOrder = useCallback(async (orderId: string, reason: string) => {
    if (!rider) return;

    try {
      await riderOrderAPI.rejectOrder(rider.riderId, orderId, reason);
      await refreshOrders();
      console.log(`❌ Order ${orderId} rejected`);
    } catch (error) {
      console.error('Failed to reject order:', error);
      throw error;
    }
  }, [rider, refreshOrders]);

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
        isLoading,
        isLoadingCompleted,
        refreshOrders,
        refreshCompletedOrders,
        acceptOrder,
        rejectOrder,
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
