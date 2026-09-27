import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import type { PendingCourse } from './types';

const PENDING_KEY = ['admin', 'courses', 'pending'] as const;

export function usePendingCourses() {
  return useQuery({
    queryKey: PENDING_KEY,
    queryFn: () => apiRequest<PendingCourse[]>('/admin/courses/pending'),
  });
}

export function useApproveCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => apiRequest(`/admin/courses/${courseId}/approve`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
    },
  });
}

export function useRejectCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, reason }: { courseId: string; reason: string }) =>
      apiRequest(`/admin/courses/${courseId}/reject`, { method: 'PATCH', body: { reason } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
    },
  });
}

export function useHideReview() {
  return useMutation({
    mutationFn: (reviewId: string) => apiRequest(`/admin/reviews/${reviewId}/hide`, { method: 'PATCH' }),
  });
}
