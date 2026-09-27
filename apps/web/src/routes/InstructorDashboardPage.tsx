import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCreateInstructorCourse, useMyInstructorCourses } from '../features/instructor-courses/hooks';
import { COURSE_CATEGORIES } from '../features/instructor-courses/categories';

export function InstructorDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: courses, isLoading } = useMyInstructorCourses();
  const createCourse = useCreateInstructorCourse();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(COURSE_CATEGORIES[0]);
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    setError(null);
    createCourse.mutate(
      { title, description, category },
      {
        onSuccess: (course) => navigate(`/instructor/courses/${course.id}`),
        onError: () => setError(t('instructor.dashboard.createError')),
      },
    );
  }

  if (isLoading) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('instructor.dashboard.title')}</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white"
        >
          {t('instructor.dashboard.newCourse')}
        </button>
      </div>

      {showForm && (
        <div className="mt-6 flex flex-col gap-3 rounded-md border border-gray-200 p-4">
          <input
            type="text"
            placeholder={t('instructor.editor.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            placeholder={t('instructor.editor.descriptionLabel')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {COURSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={createCourse.isPending || title.length < 3 || description.length < 10}
            onClick={handleCreate}
            className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {t('instructor.dashboard.create')}
          </button>
        </div>
      )}

      {courses && courses.length === 0 && <p className="mt-8 text-gray-500">{t('instructor.dashboard.empty')}</p>}

      <div className="mt-8 flex flex-col gap-2">
        {courses?.map((course) => (
          <Link
            key={course.id}
            to={`/instructor/courses/${course.id}`}
            className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3 hover:border-gray-400"
          >
            <span>{course.title}</span>
            <span className="text-sm text-gray-500">{t(`instructor.status.${course.status}`)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
