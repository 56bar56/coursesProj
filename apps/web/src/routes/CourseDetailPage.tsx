import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCourse, useEnroll, useMyEnrollments } from '../features/courses/hooks';
import { useCreateCheckout } from '../features/payments/hooks';
import { useCourseReviews, useSubmitReview } from '../features/reviews/hooks';
import { formatPrice } from '../lib/format';

export function CourseDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { data: course, isLoading } = useCourse(slug ?? '');
  const { data: enrollments } = useMyEnrollments();
  const enroll = useEnroll();
  const createCheckout = useCreateCheckout();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { data: reviews } = useCourseReviews(course?.id);
  const submitReview = useSubmitReview(course?.id ?? '');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  if (isLoading || !course) {
    return null;
  }

  function handleSubmitReview() {
    setReviewError(null);
    submitReview.mutate(
      { rating, text: reviewText },
      { onError: () => setReviewError(t('reviews.submitError')) },
    );
  }

  function handleBuy() {
    setCheckoutError(null);
    createCheckout.mutate(course!.id, {
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl;
      },
      onError: () => setCheckoutError(t('payments.checkoutError')),
    });
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
        ) : (
          <button
            type="button"
            disabled={createCheckout.isPending}
            onClick={handleBuy}
            className="rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {t('payments.buyFor', { price: formatPrice(course.priceCents, course.currency) })}
          </button>
        )}
        {checkoutError && <p className="mt-2 text-sm text-red-600">{checkoutError}</p>}
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

      <div className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="text-xl font-semibold">
          {t('reviews.title')}
          {reviews?.averageRating != null && (
            <span className="ms-2 text-sm font-normal text-gray-500">
              {t('reviews.average', { rating: reviews.averageRating.toFixed(1) })}
            </span>
          )}
        </h2>

        {isEnrolled && (
          <div className="mt-4 flex flex-col gap-2">
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <textarea
              placeholder={t('reviews.textPlaceholder')}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="min-h-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
            <button
              type="button"
              disabled={!reviewText || submitReview.isPending}
              onClick={handleSubmitReview}
              className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {t('reviews.submit')}
            </button>
          </div>
        )}

        {reviews && reviews.items.length === 0 && <p className="mt-4 text-gray-500">{t('reviews.empty')}</p>}

        <div className="mt-6 flex flex-col gap-4">
          {reviews?.items.map((review) => (
            <div key={review.id} className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{review.user.displayName}</span>
                <span className="text-gray-400">{review.rating}/5</span>
              </div>
              <p className="mt-1 text-sm text-gray-700">{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
