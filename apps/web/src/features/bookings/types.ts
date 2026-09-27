export interface Mentor {
  id: string;
  displayName: string;
}

export interface AvailabilitySlot {
  id: string;
  startAt: string;
  endAt: string;
  priceCents: number;
  currency: string;
}

export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';

export interface Booking {
  id: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  amountCents: number;
  currency: string;
  status: BookingStatus;
  videoJoinUrl: string | null;
  mentor: Mentor;
}
