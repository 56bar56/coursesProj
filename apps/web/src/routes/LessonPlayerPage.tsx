import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../lib/api-client';
import {
  useCourse,
  useCourseProgress,
  useLesson,
  useMarkLessonComplete,
  useUpdateLessonPosition,
} from '../features/courses/hooks';
import { QuizSection } from '../features/quizzes/QuizSection';

const POSITION_REPORT_INTERVAL_SEC = 10;

export function LessonPlayerPage() {
  const { t } = useTranslation();
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const { data: course } = useCourse(slug ?? '');
  const { data: lesson, isLoading, error } = useLesson(lessonId);
  const { data: progress } = useCourseProgress(course?.id);
  const markComplete = useMarkLessonComplete();
  const updatePosition = useUpdateLessonPosition();
  const lastReportedAt = useRef(0);

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-gray-600">{t('courses.player.enrollToUnlock')}</p>
        {slug && (
          <Link to={`/courses/${slug}`} className="mt-4 inline-block underline">
            {t('courses.player.enrollCta')}
          </Link>
        )}
      </div>
    );
  }

  if (isLoading || !lesson) {
    return null;
  }

  const isCompleted = progress?.completedLessonIds.includes(lesson.id) ?? false;

  function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const currentTime = Math.floor(e.currentTarget.currentTime);
    if (currentTime - lastReportedAt.current >= POSITION_REPORT_INTERVAL_SEC && lessonId) {
      lastReportedAt.current = currentTime;
      updatePosition.mutate({ lessonId, positionSec: currentTime });
    }
  }

  function handleLoadedMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    if (lesson?.type === 'VIDEO' && lesson.lastPositionSec) {
      e.currentTarget.currentTime = lesson.lastPositionSec;
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:flex-row">
      <aside className="w-full shrink-0 sm:w-64">
        {course?.modules.map((module) => (
          <div key={module.id} className="mb-4">
            <h3 className="text-sm font-semibold text-gray-500">{module.title}</h3>
            <ul className="mt-1 flex flex-col gap-1">
              {module.lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/courses/${slug}/lessons/${l.id}`}
                    className={
                      l.id === lessonId
                        ? 'font-semibold text-gray-900'
                        : 'text-sm text-gray-600 hover:text-gray-900'
                    }
                  >
                    {progress?.completedLessonIds.includes(l.id) ? '✓ ' : ''}
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      <main className="flex-1">
        <h1 className="text-xl font-semibold">{lesson.title}</h1>

        <div className="mt-4">
          {lesson.type === 'TEXT' && <p className="whitespace-pre-line text-gray-700">{lesson.textContent}</p>}

          {lesson.type === 'VIDEO' && lesson.streamUrl && (
            <video
              controls
              src={lesson.streamUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full rounded-md"
            />
          )}

          {lesson.type === 'RESOURCE' && lesson.downloadUrl && (
            <a href={lesson.downloadUrl} className="inline-block rounded-md border border-gray-300 px-4 py-2">
              {t('courses.player.downloadResource')} ({lesson.fileName})
            </a>
          )}

          {lesson.type === 'QUIZ' && 'quizId' in lesson && (
            <QuizSection quizId={lesson.quizId} timeLimitSec={lesson.timeLimitSec} questionCount={lesson.questionCount} />
          )}

          {lesson.type === 'QUIZ' && 'comingSoon' in lesson && (
            <p className="text-gray-500">{t('courses.player.quizComingSoon')}</p>
          )}
        </div>

        {!(lesson.type === 'QUIZ' && 'quizId' in lesson) && (
          <button
            type="button"
            disabled={isCompleted || markComplete.isPending}
            onClick={() => lessonId && markComplete.mutate(lessonId)}
            className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {isCompleted ? t('courses.player.completed') : t('courses.player.markComplete')}
          </button>
        )}
      </main>
    </div>
  );
}
