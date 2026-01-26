export interface Rider {
  riderId: string;
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  riderStatus: 'SIGNUP_DONE' | 'APPROVED' | 'REJECTED';
  isActive: boolean;
  isOnline: boolean;
  lat?: number;
  lng?: number;
  workingOnOrder?: string;
}

export interface RiderOrder {
  orderId: string;
  customerPhone: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  items: OrderItem[];
  foodTotal: number;
  deliveryFee: number;
  platformFee: number;
  grandTotal: number;
  status: OrderStatus;
  riderId?: string;
  deliveryAddress: string;
  formattedAddress?: string;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryOtp?: string;
  riderAssignedAt?: string;
  riderPickupAt?: string;
  riderDeliveredAt?: string;
  createdAt: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 
  | 'INITIATED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Earnings {
  riderId: string;
  date: string;
  totalDeliveries: number;
  totalEarnings: number;
  deliveryFees: number;
  tips: number;
  incentives: number;
  onlineTimeMinutes: number;
}

export interface EarningsSummary {
  period: 'today' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
  totalDeliveries: number;
  totalEarnings: number;
  totalTips: number;
  dailyBreakdown?: Earnings[];
}
