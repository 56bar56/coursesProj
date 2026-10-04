import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../../lib/api-client';
import type { User } from './types';

const ME_QUERY_KEY = ['auth', 'me'] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => apiRequest<{ user: User } | User>('/users/me').then(unwrapUser),
    retry: false,
  });
}

// Some auth endpoints return { user }, /users/me returns the user directly.
function unwrapUser(payload: { user: User } | User): User {
  return 'user' in payload ? payload.user : payload;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiRequest<{ user: User }>('/auth/login', { method: 'POST', body: input }),
    onSuccess: (data) => {
      queryClient.setQueryData(ME_QUERY_KEY, data.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string; displayName: string; signupCode?: string }) =>
      apiRequest<{ user: User }>('/auth/register', { method: 'POST', body: input }),
    onSuccess: (data) => {
      queryClient.setQueryData(ME_QUERY_KEY, data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(ME_QUERY_KEY, null);
    },
  });
}

export { ApiError };
