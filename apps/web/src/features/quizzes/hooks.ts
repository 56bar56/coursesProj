import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import type { AnswerInput, AttemptReport, AttemptStart, PastAttempt } from './types';

export function useStartAttempt() {
  return useMutation({
    mutationFn: (quizId: string) => apiRequest<AttemptStart>(`/quizzes/${quizId}/attempts`, { method: 'POST' }),
  });
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ attemptId, answers }: { attemptId: string; answers: AnswerInput[] }) =>
      apiRequest<AttemptReport>(`/quizzes/attempts/${attemptId}/submit`, { method: 'POST', body: { answers } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

export function usePastAttempts(quizId: string | undefined) {
  return useQuery({
    queryKey: ['quizzes', quizId, 'attempts'],
    queryFn: () => apiRequest<PastAttempt[]>(`/quizzes/${quizId}/attempts`),
    enabled: !!quizId,
  });
}
