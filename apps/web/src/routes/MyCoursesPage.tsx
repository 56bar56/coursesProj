import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMyEnrollments } from '../features/courses/hooks';

export function MyCoursesPage() {
  const { t } = useTranslation();
  const { data: enrollments, isLoading } = useMyEnrollments();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t('courses.myCourses.title')}</h1>

      {isLoading && <p className="mt-6 text-gray-500">…</p>}

      {enrollments && enrollments.length === 0 && (
        <p className="mt-6 text-gray-500">{t('courses.myCourses.empty')}</p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {enrollments?.map((enrollment) => (
          <Link
            key={enrollment.id}
            to={`/courses/${enrollment.course.slug}`}
            className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 hover:border-gray-400"
          >
            <h2 className="font-semibold">{enrollment.course.title}</h2>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-gray-900"
                style={{ width: `${enrollment.progressPct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {t('courses.myCourses.progress', { percent: enrollment.progressPct })}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
