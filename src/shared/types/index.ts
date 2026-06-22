export enum UserRole {
  USER = 'USER',
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum BudgetTier {
  BUDGET = 'BUDGET',
  MID = 'MID',
  PREMIUM = 'PREMIUM',
  LUXURY = 'LUXURY',
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface PaystackWebhookEvent {
  event: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    customer: {
      email: string;
    };
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
}
