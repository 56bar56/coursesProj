import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import type { ReviewList } from './types';

const reviewsKey = (courseId: string) => ['reviews', courseId] as const;

export function useCourseReviews(courseId: string | undefined) {
  return useQuery({
    queryKey: courseId ? reviewsKey(courseId) : ['reviews'],
    queryFn: () => apiRequest<ReviewList>(`/courses/${courseId}/reviews`),
    enabled: !!courseId,
  });
}

export function useSubmitReview(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; text: string }) =>
      apiRequest(`/courses/${courseId}/reviews`, { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewsKey(courseId) });
    },
  });
}
