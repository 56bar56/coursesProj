import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function StubCallPage() {
  const { t } = useTranslation();
  const { bookingId } = useParams<{ bookingId: string }>();

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">{t('bookings.stubCall.title')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('bookings.stubCall.description')}</p>
      <p className="mt-4 text-xs text-gray-400">{bookingId}</p>
    </div>
  );
}
