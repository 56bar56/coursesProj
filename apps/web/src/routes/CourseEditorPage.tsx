import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useAddLesson,
  useAddModule,
  useDeleteLesson,
  useDeleteModule,
  useInstructorCourse,
  useSubmitInstructorCourse,
  useUpdateInstructorCourse,
} from '../features/instructor-courses/hooks';
import { COURSE_CATEGORIES } from '../features/instructor-courses/categories';

export function CourseEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: course, isLoading } = useInstructorCourse(id);
  const updateCourse = useUpdateInstructorCourse(id ?? '');
  const submitCourse = useSubmitInstructorCourse(id ?? '');
  const addModule = useAddModule(id ?? '');
  const deleteModule = useDeleteModule(id ?? '');
  const addLesson = useAddLesson(id ?? '');
  const deleteLesson = useDeleteLesson(id ?? '');

  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [lessonDraft, setLessonDraft] = useState<{ moduleId: string; title: string; textContent: string } | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (isLoading || !course) {
    return null;
  }

  const isEditable = course.status === 'DRAFT' || course.status === 'REJECTED';

  function handleSubmit() {
    setSubmitError(null);
    submitCourse.mutate(undefined, {
      onError: () => setSubmitError(t('instructor.editor.submitError')),
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        <span className="text-sm text-gray-500">{t(`instructor.status.${course.status}`)}</span>
      </div>

      {course.status === 'REJECTED' && course.rejectionReason && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>{t('instructor.editor.rejectionReasonLabel')}:</strong> {course.rejectionReason}
        </div>
      )}

      {!isEditable && (
        <p className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {t('instructor.editor.readOnlyNotice')}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <input
          type="text"
          disabled={!isEditable}
          defaultValue={course.title}
          onBlur={(e) => e.target.value !== course.title && updateCourse.mutate({ title: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
        <textarea
          disabled={!isEditable}
          defaultValue={course.description}
          onBlur={(e) =>
            e.target.value !== course.description && updateCourse.mutate({ description: e.target.value })
          }
          className="min-h-24 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
        <select
          disabled={!isEditable}
          defaultValue={course.category}
          onChange={(e) => updateCourse.mutate({ category: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        >
          {COURSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {course.modules.map((module) => (
          <div key={module.id} className="rounded-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{module.title}</h2>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => deleteModule.mutate(module.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  {t('instructor.editor.deleteModule')}
                </button>
              )}
            </div>

            <ul className="mt-3 flex flex-col gap-2">
              {module.lessons.map((lesson) => (
                <li key={lesson.id} className="flex items-center justify-between text-sm">
                  <span>{lesson.title}</span>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => deleteLesson.mutate({ moduleId: module.id, lessonId: lesson.id })}
                      className="text-red-600 hover:underline"
                    >
                      {t('instructor.editor.deleteLesson')}
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {isEditable &&
              (lessonDraft?.moduleId === module.id ? (
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder={t('instructor.editor.lessonTitleLabel')}
                    value={lessonDraft.title}
                    onChange={(e) => setLessonDraft({ ...lessonDraft, title: e.target.value })}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    placeholder={t('instructor.editor.lessonContentLabel')}
                    value={lessonDraft.textContent}
                    onChange={(e) => setLessonDraft({ ...lessonDraft, textContent: e.target.value })}
                    className="min-h-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!lessonDraft.title || !lessonDraft.textContent}
                      onClick={() => {
                        addLesson.mutate(lessonDraft);
                        setLessonDraft(null);
                      }}
                      className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      {t('instructor.editor.saveLesson')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLessonDraft(null)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    >
                      {t('instructor.editor.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLessonDraft({ moduleId: module.id, title: '', textContent: '' })}
                  className="mt-3 text-sm text-gray-600 underline hover:text-gray-900"
                >
                  {t('instructor.editor.addLesson')}
                </button>
              ))}
          </div>
        ))}
      </div>

      {isEditable && (
        <div className="mt-6 flex items-center gap-2">
          <input
            type="text"
            placeholder={t('instructor.editor.moduleTitleLabel')}
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!newModuleTitle}
            onClick={() => {
              addModule.mutate(newModuleTitle);
              setNewModuleTitle('');
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            {t('instructor.editor.addModule')}
          </button>
        </div>
      )}

      {isEditable && (
        <div className="mt-8">
          {submitError && <p className="mb-2 text-sm text-red-600">{submitError}</p>}
          <button
            type="button"
            disabled={submitCourse.isPending}
            onClick={handleSubmit}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {t('instructor.editor.submitForReview')}
          </button>
        </div>
      )}
    </div>
  );
}
