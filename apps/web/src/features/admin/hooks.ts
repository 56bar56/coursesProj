import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import type { Role } from '../auth/types';
import type { AdminUserList, PendingCourse, PlatformMetrics } from './types';

const PENDING_KEY = ['admin', 'courses', 'pending'] as const;
const USERS_KEY = ['admin', 'users'] as const;

export interface AdminUserFilters {
  search?: string;
  role?: Role;
  page?: number;
  limit?: number;
}

function toQueryString(filters: AdminUserFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.role) params.set('role', filters.role);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useAdminUsers(filters: AdminUserFilters = {}) {
  return useQuery({
    queryKey: [...USERS_KEY, filters],
    queryFn: () => apiRequest<AdminUserList>(`/admin/users${toQueryString(filters)}`),
  });
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: Role[] }) =>
      apiRequest(`/users/${userId}/roles`, { method: 'PATCH', body: { roles } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function usePlatformMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => apiRequest<PlatformMetrics>('/admin/metrics'),
  });
}

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
