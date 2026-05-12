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

/** Subset of calculate-fee response stored on order; rider job payout uses riderSettlementAmount */
export interface RiderOrderCalculatedFeeResponse {
  riderSettlementAmount?: number;
  deliveryFee?: number;
  [key: string]: unknown;
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
  /** From order e.g. UPI, COD */
  paymentMethod?: string;
  paymentId?: string;
  status: OrderStatus;
  riderId?: string;
  deliveryAddress: string;
  formattedAddress?: string;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  pickupOtp?: string;
  deliveryOtp?: string;
  riderAssignedAt?: string;
  riderPickupAt?: string;
  riderDeliveredAt?: string;
  offeredAt?: string;
  createdAt: string;
  calculatedFeeResponse?: RiderOrderCalculatedFeeResponse;
  revenue?: {
    riderRevenue?: {
      finalPayout?: number;
      riderSettlementAmount?: number;
      longDistanceBonus?: number;
    };
    [key: string]: unknown;
  };
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
  | 'AWAITING_RIDER_ASSIGNMENT'
  | 'OFFERED_TO_RIDER'
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
  orderId?: string | null;
  settlementId?: string | null;
  settled?: boolean;
  settledAt?: string | null;
  createdAt?: string;
  entryType?: 'ORDER_EARNING' | 'MILESTONE_BONUS';
  bonusType?: string | null;
  milestoneStops?: number | null;
  campaignStartDate?: string | null;
  campaignEndDate?: string | null;
  bonusLabel?: string | null;
}

export interface RiderBonusMilestone {
  stops: number;
  amount: number;
}

export interface RiderBonusCampaign {
  enabled: boolean;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  targetStops: number;
  milestones: RiderBonusMilestone[];
  status?: 'upcoming' | 'active' | 'ended';
}

export interface RiderBonusReachedMilestone extends RiderBonusMilestone {
  credited: boolean;
  creditedAt?: string | null;
}

export interface RiderBonusProgress {
  completedStops: number;
  remainingStops: number;
  reachedMilestones: RiderBonusReachedMilestone[];
  nextMilestone?: {
    stops: number;
    amount: number;
    remainingStops: number;
  } | null;
  totalBonusEarned?: number;
}

export interface RiderBonusProgressResponse {
  campaign: RiderBonusCampaign | null;
  progress: RiderBonusProgress | null;
}

export interface EarningsSummary {
  period: 'today' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
  totalDeliveries: number;
  totalEarnings: number;
  totalTips: number;
  totalIncentives?: number;
  totalBonusEarnings?: number;
  deliveryEarnings?: number;
  dailyBreakdown?: Earnings[];
  bonusCampaign?: RiderBonusCampaign | null;
  bonusProgress?: RiderBonusProgress | null;
}
