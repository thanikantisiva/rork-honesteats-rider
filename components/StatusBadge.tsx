/**
 * Status Badge Component
 * Color-coded order status indicator
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OrderStatus } from '@/types';

interface StatusBadgeProps {
  status: OrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<OrderStatus, { label: string; bgColor: string; textColor: string }> = {
    INITIATED: { label: 'Initiated', bgColor: '#F3F4F6', textColor: '#6B7280' },
    PENDING: { label: 'Pending', bgColor: '#FEF3C7', textColor: '#92400E' },
    CONFIRMED: { label: 'New Order', bgColor: '#DBEAFE', textColor: '#1E40AF' },
    ACCEPTED: { label: 'Accepted', bgColor: '#D1FAE5', textColor: '#065F46' },
    PREPARING: { label: 'Preparing', bgColor: '#FED7AA', textColor: '#9A3412' },
    READY: { label: 'Ready', bgColor: '#BBF7D0', textColor: '#14532D' },
    RIDER_ASSIGNED: { label: 'Assigned', bgColor: '#FEF3C7', textColor: '#92400E' },
    PICKED_UP: { label: 'Picked Up', bgColor: '#D1FAE5', textColor: '#065F46' },
    OUT_FOR_DELIVERY: { label: 'In Transit', bgColor: '#DBEAFE', textColor: '#1E3A8A' },
    DELIVERED: { label: 'Delivered', bgColor: '#D1FAE5', textColor: '#065F46' },
    CANCELLED: { label: 'Cancelled', bgColor: '#FEE2E2', textColor: '#991B1B' },
  };

  const { label, bgColor, textColor } = config[status] || config.PENDING;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
