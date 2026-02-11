/**
 * Status Badge Component
 * Modern color-coded order status indicator
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OrderStatus } from '@/types';
import { riderTheme } from '@/theme/riderTheme';

interface StatusBadgeProps {
  status: OrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<OrderStatus, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
    INITIATED: { 
      label: 'Initiated', 
      bgColor: riderTheme.colors.surfaceMuted, 
      textColor: riderTheme.colors.textSecondary,
      borderColor: riderTheme.colors.border
    },
    PENDING: { 
      label: 'Pending', 
      bgColor: riderTheme.colors.warningSoft, 
      textColor: riderTheme.colors.warningDark,
      borderColor: riderTheme.colors.warning
    },
    CONFIRMED: { 
      label: 'New Order', 
      bgColor: riderTheme.colors.primarySoft, 
      textColor: riderTheme.colors.primaryDark,
      borderColor: riderTheme.colors.primary
    },
    ACCEPTED: { 
      label: 'Accepted', 
      bgColor: riderTheme.colors.successSoft, 
      textColor: riderTheme.colors.successDark,
      borderColor: riderTheme.colors.success
    },
    PREPARING: { 
      label: 'Preparing', 
      bgColor: riderTheme.colors.warningSoft, 
      textColor: riderTheme.colors.warningDark,
      borderColor: riderTheme.colors.warning
    },
    READY: { 
      label: 'Ready', 
      bgColor: riderTheme.colors.successSoft, 
      textColor: riderTheme.colors.successDark,
      borderColor: riderTheme.colors.success
    },
    AWAITING_RIDER_ASSIGNMENT: { 
      label: 'Finding Dude', 
      bgColor: riderTheme.colors.warningSoft, 
      textColor: riderTheme.colors.warningDark,
      borderColor: riderTheme.colors.warning
    },
    OFFERED_TO_RIDER: { 
      label: 'New Offer', 
      bgColor: riderTheme.colors.infoSoft, 
      textColor: riderTheme.colors.infoDark,
      borderColor: riderTheme.colors.info
    },
    RIDER_ASSIGNED: { 
      label: 'Assigned', 
      bgColor: riderTheme.colors.primarySoft, 
      textColor: riderTheme.colors.primaryDark,
      borderColor: riderTheme.colors.primary
    },
    PICKED_UP: { 
      label: 'Picked Up', 
      bgColor: riderTheme.colors.successSoft, 
      textColor: riderTheme.colors.successDark,
      borderColor: riderTheme.colors.success
    },
    OUT_FOR_DELIVERY: { 
      label: 'In Transit', 
      bgColor: riderTheme.colors.primarySoft, 
      textColor: riderTheme.colors.primaryDark,
      borderColor: riderTheme.colors.primary
    },
    DELIVERED: { 
      label: 'Delivered', 
      bgColor: riderTheme.colors.successSoft, 
      textColor: riderTheme.colors.successDark,
      borderColor: riderTheme.colors.success
    },
    CANCELLED: { 
      label: 'Cancelled', 
      bgColor: riderTheme.colors.dangerSoft, 
      textColor: riderTheme.colors.dangerDark,
      borderColor: riderTheme.colors.danger
    },
  };

  const { label, bgColor, textColor, borderColor } = config[status] || config.PENDING;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor, borderColor: borderColor }]}>
      <View style={[styles.dot, { backgroundColor: textColor }]} />
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: riderTheme.radius.full,
    borderWidth: 1,
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
