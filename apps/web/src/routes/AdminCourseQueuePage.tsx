import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApproveCourse, usePendingCourses, useRejectCourse } from '../features/admin/hooks';

export function AdminCourseQueuePage() {
  const { t } = useTranslation();
  const { data: courses, isLoading } = usePendingCourses();
  const approve = useApproveCourse();
  const reject = useRejectCourse();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (isLoading) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t('admin.queue.title')}</h1>

      {courses && courses.length === 0 && <p className="mt-6 text-gray-500">{t('admin.queue.empty')}</p>}

      <div className="mt-6 flex flex-col gap-4">
        {courses?.map((course) => (
          <div key={course.id} className="rounded-md border border-gray-200 p-4">
            <h2 className="font-semibold">{course.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{course.description}</p>
            <p className="mt-1 text-xs text-gray-400">
              {course.category} · {course.ownerInstructor.displayName} ({course.ownerInstructor.email})
            </p>

            <ul className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
              {course.modules.map((module) => (
                <li key={module.id}>
                  {module.title} — {t('admin.queue.lessonsCount', { count: module.lessons.length })}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={approve.isPending}
                onClick={() => approve.mutate(course.id)}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {t('admin.queue.approve')}
              </button>
              <button
                type="button"
                onClick={() => setRejectingId(rejectingId === course.id ? null : course.id)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                {t('admin.queue.reject')}
              </button>
            </div>

            {rejectingId === course.id && (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  placeholder={t('admin.queue.reasonPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!reason || reject.isPending}
                  onClick={() =>
                    reject.mutate(
                      { courseId: course.id, reason },
                      {
                        onSuccess: () => {
                          setRejectingId(null);
                          setReason('');
                        },
                      },
                    )
                  }
                  className="self-start rounded-md bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  {t('admin.queue.confirmReject')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
