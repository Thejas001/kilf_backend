export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export type FestivalStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

export interface Festival {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  venue: string | null;
  startDate: string;
  endDate: string;
  registrationStart: string | null;
  registrationEnd: string | null;
  bannerImage: string | null;
  status: FestivalStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { tickets: number; bookings: number; sponsors: number };
}

export type TicketType = 'GENERAL' | 'VIP' | 'STUDENT' | 'EARLY_BIRD' | 'DAY_PASS' | 'FULL_FESTIVAL';
export type TicketSaleStatus = 'ACTIVE' | 'INACTIVE';

export interface Ticket {
  id: string;
  festivalId: string;
  festival?: { id: string; name: string };
  name: string;
  description: string | null;
  ticketType: TicketType;
  price: string | number;
  currency: string;
  totalQuantity: number;
  availableQuantity: number;
  salesStart: string;
  salesEnd: string;
  status: TicketSaleStatus;
  createdAt: string;
  updatedAt: string;
  ticketsSold?: number;
  revenue?: string | number;
  utilizationPercentage?: number;
}

export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Payment {
  id: string;
  provider: string;
  providerPaymentId: string | null;
  amount: string | number;
  currency: string;
  status: PaymentStatus;
  refundedAmount: string | number;
  createdAt: string;
}

export interface BookingItem {
  id: string;
  ticketId: string;
  ticket: { id: string; name: string; ticketType: TicketType };
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
}

export interface TicketInstance {
  id: string;
  ticketNumber: string;
  qrCode: string;
  status: 'VALID' | 'USED' | 'CANCELLED';
  checkedInAt: string | null;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  festivalId: string;
  festival: { id: string; name: string };
  customer: Customer;
  status: BookingStatus;
  quantity: number;
  totalAmount: string | number;
  currency: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  bookingItems: BookingItem[];
  payments: Payment[];
  ticketInstances?: TicketInstance[];
}

export type SponsorshipLevel = 'TITLE' | 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'PARTNER';
export type SponsorStatus = 'ACTIVE' | 'INACTIVE';

export interface Sponsor {
  id: string;
  festivalId: string | null;
  name: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sponsorshipLevel: SponsorshipLevel;
  amount: string | number | null;
  status: SponsorStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  message: string;
  pagination: Pagination;
}

export interface ApiItemResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface DashboardStats {
  tickets: { total: number; sold: number; available: number; utilizationPercentage: number };
  bookings: {
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    refunded: number;
    expired: number;
  };
  revenue: {
    total: number;
    refunds: number;
    net: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    ticketsSold: number;
  };
  sponsors: { total: number; active: number };
  charts: {
    revenueByDay: { date: string; revenue: number; transactions: number }[];
    revenueByMonth: { month: string; revenue: number; transactions: number }[];
    revenueByTicketType: { name: string; ticketType: string; quantitySold: number; revenue: number }[];
  };
}

export interface RevenueSummary {
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  ticketsSold: number;
  averageTicketValue: number;
}

export interface AuditLog {
  id: string;
  adminId: string | null;
  admin: { id: string; name: string; email: string } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
}
