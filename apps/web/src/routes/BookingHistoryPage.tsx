import { useTranslation } from 'react-i18next';
import { useBookings, useCancelBooking } from '../features/bookings/hooks';
import { API_URL } from '../lib/api-client';
import { formatPrice } from '../lib/format';

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export function BookingHistoryPage() {
  const { t } = useTranslation();
  const { data: bookings, isLoading } = useBookings();
  const cancelBooking = useCancelBooking();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t('bookings.history.title')}</h1>

      {isLoading && <p className="mt-6 text-gray-500">…</p>}
      {bookings && bookings.length === 0 && <p className="mt-6 text-gray-500">{t('bookings.history.empty')}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {bookings?.map((booking) => {
          const isFuture = new Date(booking.scheduledStartAt) > new Date();
          return (
            <div key={booking.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-semibold">{booking.mentor.displayName}</p>
                <p className="text-sm text-gray-500">{new Date(booking.scheduledStartAt).toLocaleString()}</p>
                {booking.status === 'CONFIRMED' && booking.videoJoinUrl && (
                  <div className="mt-2 flex gap-3 text-sm">
                    <a href={booking.videoJoinUrl} className="underline">
                      {t('bookings.history.joinCall')}
                    </a>
                    <a href={`${API_URL}/bookings/${booking.id}/ics`} className="underline">
                      {t('bookings.history.addToCalendar')}
                    </a>
                  </div>
                )}
                {isFuture && booking.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    disabled={cancelBooking.isPending}
                    onClick={() => cancelBooking.mutate(booking.id)}
                    className="mt-2 text-sm text-red-600 underline disabled:opacity-50"
                  >
                    {t('bookings.history.cancel')}
                  </button>
                )}
              </div>
              <div className="text-right">
                <p>{formatPrice(booking.amountCents, booking.currency)}</p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[booking.status] ?? ''}`}
                >
                  {t(`bookings.history.status.${booking.status}`)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
