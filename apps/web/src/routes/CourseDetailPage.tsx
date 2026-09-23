import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCourse, useEnroll, useMyEnrollments } from '../features/courses/hooks';

export function CourseDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { data: course, isLoading } = useCourse(slug ?? '');
  const { data: enrollments } = useMyEnrollments();
  const enroll = useEnroll();

  if (isLoading || !course) {
    return null;
  }

  const isEnrolled = enrollments?.some((e) => e.course.slug === course.slug) ?? false;
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{course.title}</h1>
      <p className="mt-2 text-gray-600">{course.description}</p>
      <p className="mt-1 text-sm text-gray-400">
        {course.category} · {t('courses.detail.lessonsCount', { count: totalLessons })}
      </p>

      <div className="mt-6">
        {isEnrolled ? (
          <Link
            to={`/courses/${course.slug}/lessons/${course.modules[0]?.lessons[0]?.id}`}
            className="inline-block rounded-md bg-gray-900 px-4 py-2 text-white"
          >
            {t('courses.detail.continueLearning')}
          </Link>
        ) : course.isFree ? (
          <button
            type="button"
            disabled={enroll.isPending}
            onClick={() => enroll.mutate(course.id)}
            className="rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {t('courses.detail.enrollFree')}
          </button>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {course.modules.map((module) => (
          <div key={module.id}>
            <h2 className="font-semibold">{module.title}</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {module.lessons.map((lesson) =>
                isEnrolled ? (
                  <li key={lesson.id}>
                    <Link
                      to={`/courses/${course.slug}/lessons/${lesson.id}`}
                      className="text-sm text-gray-700 underline hover:text-gray-900"
                    >
                      {lesson.title}
                    </Link>
                  </li>
                ) : (
                  <li key={lesson.id} className="text-sm text-gray-500">
                    {lesson.title}
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
