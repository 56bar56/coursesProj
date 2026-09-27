import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMentors } from '../features/bookings/hooks';

export function MentorListPage() {
  const { t } = useTranslation();
  const { data: mentors, isLoading } = useMentors();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t('bookings.mentorList.title')}</h1>

      {isLoading && <p className="mt-6 text-gray-500">…</p>}
      {mentors && mentors.length === 0 && <p className="mt-6 text-gray-500">{t('bookings.mentorList.empty')}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {mentors?.map((mentor) => (
          <Link
            key={mentor.id}
            to={`/mentors/${mentor.id}`}
            className="rounded-lg border border-gray-200 p-4 hover:border-gray-400"
          >
            <h2 className="font-semibold">{mentor.displayName}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
