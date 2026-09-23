import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import type { CourseDetail, CourseList, CourseProgress, Enrollment, LessonContent } from './types';

export interface CourseFilters {
  search?: string;
  category?: string;
  language?: string;
  page?: number;
  limit?: number;
}

function toQueryString(filters: CourseFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.language) params.set('language', filters.language);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useCourses(filters: CourseFilters = {}) {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: () => apiRequest<CourseList>(`/courses${toQueryString(filters)}`),
  });
}

export function useCourse(slug: string) {
  return useQuery({
    queryKey: ['courses', slug],
    queryFn: () => apiRequest<CourseDetail>(`/courses/${slug}`),
    enabled: !!slug,
  });
}

export function useMyEnrollments() {
  return useQuery({
    queryKey: ['enrollments', 'me'],
    queryFn: () => apiRequest<Enrollment[]>('/enrollments/me'),
  });
}

export function useEnroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => apiRequest('/enrollments', { method: 'POST', body: { courseId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'me'] });
    },
  });
}

export function useLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ['lessons', lessonId],
    queryFn: () => apiRequest<LessonContent>(`/lessons/${lessonId}`),
    enabled: !!lessonId,
    retry: false,
  });
}

export function useMarkLessonComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => apiRequest(`/progress/lessons/${lessonId}/complete`, { method: 'POST' }),
    onSuccess: (_data, lessonId) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      void lessonId;
    },
  });
}

export function useUpdateLessonPosition() {
  return useMutation({
    mutationFn: ({ lessonId, positionSec }: { lessonId: string; positionSec: number }) =>
      apiRequest(`/progress/lessons/${lessonId}/position`, { method: 'PATCH', body: { positionSec } }),
  });
}

export function useCourseProgress(courseId: string | undefined) {
  return useQuery({
    queryKey: ['progress', 'course', courseId],
    queryFn: () => apiRequest<CourseProgress>(`/progress/courses/${courseId}`),
    enabled: !!courseId,
  });
}
