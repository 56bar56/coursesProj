import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCourses } from '../features/courses/hooks';

export function CourseCataloguePage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useCourses({ search: search || undefined });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t('courses.catalogue.title')}</h1>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('courses.catalogue.searchPlaceholder') ?? ''}
        className="mt-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-2"
      />

      {isLoading && <p className="mt-6 text-gray-500">…</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {data?.items.map((course) => (
          <Link
            key={course.id}
            to={`/courses/${course.slug}`}
            className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 hover:border-gray-400"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{course.title}</h2>
              {course.isFree && (
                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  {t('courses.catalogue.free')}
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-sm text-gray-600">{course.description}</p>
            <span className="text-xs text-gray-400">{course.category}</span>
          </Link>
        ))}
      </div>

      {data && data.items.length === 0 && (
        <p className="mt-6 text-gray-500">{t('courses.catalogue.empty')}</p>
      )}
    </div>
  );
}
