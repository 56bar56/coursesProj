import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import type {
  CreateCourseInput,
  InstructorCourseDetail,
  InstructorCourseSummary,
  UpdateCourseInput,
} from './types';

const LIST_KEY = ['instructor-courses'] as const;
const detailKey = (id: string) => ['instructor-courses', id] as const;

export function useMyInstructorCourses() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () => apiRequest<InstructorCourseSummary[]>('/instructor/courses'),
  });
}

export function useInstructorCourse(id: string | undefined) {
  return useQuery({
    queryKey: id ? detailKey(id) : LIST_KEY,
    queryFn: () => apiRequest<InstructorCourseDetail>(`/instructor/courses/${id}`),
    enabled: !!id,
  });
}

export function useCreateInstructorCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCourseInput) =>
      apiRequest<InstructorCourseSummary>('/instructor/courses', { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateInstructorCourse(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCourseInput) =>
      apiRequest<InstructorCourseSummary>(`/instructor/courses/${courseId}`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(courseId) });
    },
  });
}

export function useDeleteInstructorCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => apiRequest(`/instructor/courses/${courseId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useSubmitInstructorCourse(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest(`/instructor/courses/${courseId}/submit`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(courseId) });
    },
  });
}

export function useAddModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) =>
      apiRequest(`/instructor/courses/${courseId}/modules`, { method: 'POST', body: { title } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailKey(courseId) });
    },
  });
}

export function useDeleteModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moduleId: string) =>
      apiRequest(`/instructor/courses/${courseId}/modules/${moduleId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailKey(courseId) });
    },
  });
}

export function useAddLesson(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, title, textContent }: { moduleId: string; title: string; textContent: string }) =>
      apiRequest(`/instructor/courses/${courseId}/modules/${moduleId}/lessons`, {
        method: 'POST',
        body: { title, textContent },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailKey(courseId) });
    },
  });
}

export function useDeleteLesson(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      apiRequest(`/instructor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailKey(courseId) });
    },
  });
}
