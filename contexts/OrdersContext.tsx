/**
 * Orders Context for Rider App
 * Manages rider's assigned orders
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { riderOrderAPI } from '@/lib/api';
import { RiderOrder } from '@/types';
import { useAuth } from './AuthContext';

interface OrdersContextType {
  orders: RiderOrder[];
  activeOrders: RiderOrder[];
  completedOrders: RiderOrder[];
  isLoading: boolean;
  refreshOrders: () => Promise<void>;
  acceptOrder: (orderId: string) => Promise<void>;
  rejectOrder: (orderId: string, reason: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string, otp?: string) => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { rider, isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn && rider) {
      refreshOrders();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(refreshOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, rider]);

  const refreshOrders = useCallback(async () => {
    if (!rider) return;

    setIsLoading(true);
    try {
      const response = await riderOrderAPI.getOrders(rider.riderId);
      setOrders(response.orders);
      console.log(`📦 Fetched ${response.orders.length} orders for rider`);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [rider]);

  const acceptOrder = useCallback(async (orderId: string) => {
    if (!rider) return;

    try {
      await riderOrderAPI.acceptOrder(rider.riderId, orderId);
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
      console.log(`📝 Order ${orderId} status updated to ${status}`);
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  }, [rider, refreshOrders]);

  const activeOrders = orders.filter(
    (o) => ['CONFIRMED', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.status)
  );

  const completedOrders = orders.filter((o) => o.status === 'DELIVERED');

  return (
    <OrdersContext.Provider
      value={{
        orders,
        activeOrders,
        completedOrders,
        isLoading,
        refreshOrders,
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
