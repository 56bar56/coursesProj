import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import type { ChatTurn } from './types';

export function useExplainMistake(attemptId: string, questionId: string) {
  return useMutation({
    mutationFn: (input: { messages: ChatTurn[]; locale: 'en' | 'he' }) =>
      apiRequest<{ reply: string }>(`/quizzes/attempts/${attemptId}/questions/${questionId}/explain`, {
        method: 'POST',
        body: input,
      }),
  });
}
