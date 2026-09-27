import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import type { AvailabilitySlot, Booking, Mentor } from './types';

export function useMentors() {
  return useQuery({
    queryKey: ['mentors'],
    queryFn: () => apiRequest<Mentor[]>('/mentors'),
  });
}

export function useMentorAvailability(mentorId: string | undefined) {
  return useQuery({
    queryKey: ['mentors', mentorId, 'availability'],
    queryFn: () => apiRequest<AvailabilitySlot[]>(`/mentors/${mentorId}/availability`),
    enabled: !!mentorId,
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: (slotId: string) => apiRequest<Booking>('/bookings', { method: 'POST', body: { slotId } }),
  });
}

export function useBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: () => apiRequest<Booking[]>('/bookings'),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => apiRequest(`/bookings/${bookingId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['mentors'] });
    },
  });
}
