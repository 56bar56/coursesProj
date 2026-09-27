export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface Order {
  id: string;
  amountCents: number;
  currency: string;
  status: OrderStatus;
  provider: string;
  providerRef: string | null;
  createdAt: string;
  course: {
    id: string;
    slug: string;
    title: string;
  } | null;
  booking: {
    id: string;
    mentor: { id: string; displayName: string };
  } | null;
}

export interface CheckoutResult {
  checkoutUrl: string;
  orderId: string;
}
