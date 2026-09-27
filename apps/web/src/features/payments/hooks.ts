import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import type { CheckoutResult, Order } from './types';

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (courseId: string) =>
      apiRequest<CheckoutResult>('/payments/checkout', { method: 'POST', body: { courseId } }),
  });
}

export function useCreateBookingCheckout() {
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiRequest<CheckoutResult>('/payments/booking-checkout', { method: 'POST', body: { bookingId } }),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ['payments', 'orders'],
    queryFn: () => apiRequest<Order[]>('/payments/orders'),
  });
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['payments', 'orders', orderId],
    queryFn: () => apiRequest<Order>(`/payments/orders/${orderId}`),
    enabled: !!orderId,
  });
}

export function useSimulateOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, outcome }: { orderId: string; outcome: 'success' | 'failure' }) =>
      apiRequest(`/payments/fake/${orderId}/simulate`, { method: 'POST', body: { outcome } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
