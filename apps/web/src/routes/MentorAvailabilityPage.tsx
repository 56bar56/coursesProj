import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMe } from '../features/auth/hooks';
import { useCreateBooking, useMentorAvailability } from '../features/bookings/hooks';
import { useCreateBookingCheckout } from '../features/payments/hooks';
import { formatPrice } from '../lib/format';
import type { AvailabilitySlot } from '../features/bookings/types';

export function MentorAvailabilityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mentorId } = useParams<{ mentorId: string }>();
  const { data: user } = useMe();
  const { data: slots, isLoading } = useMentorAvailability(mentorId);
  const createBooking = useCreateBooking();
  const createBookingCheckout = useCreateBookingCheckout();
  const [error, setError] = useState<string | null>(null);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);

  function handleBook(slotId: string) {
    if (!user) {
      navigate('/login');
      return;
    }
    setError(null);
    setPendingSlotId(slotId);
    createBooking.mutate(slotId, {
      onSuccess: (booking) => {
        createBookingCheckout.mutate(booking.id, {
          onSuccess: (data) => {
            window.location.href = data.checkoutUrl;
          },
          onError: () => {
            setError(t('bookings.bookError'));
            setPendingSlotId(null);
          },
        });
      },
      onError: () => {
        setError(t('bookings.slotUnavailable'));
        setPendingSlotId(null);
      },
    });
  }

  if (isLoading) {
    return null;
  }

  const slotsByDay = new Map<string, AvailabilitySlot[]>();
  for (const slot of slots ?? []) {
    const day = new Date(slot.startAt).toLocaleDateString();
    const existing = slotsByDay.get(day) ?? [];
    existing.push(slot);
    slotsByDay.set(day, existing);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t('bookings.availability.title')}</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {slots && slots.length === 0 && <p className="mt-6 text-gray-500">{t('bookings.availability.empty')}</p>}

      <div className="mt-6 flex flex-col gap-6">
        {[...slotsByDay.entries()].map(([day, daySlots]) => (
          <div key={day}>
            <h2 className="text-sm font-semibold text-gray-500">{day}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {daySlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  disabled={pendingSlotId === slot.id}
                  onClick={() => handleBook(slot.id)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:border-gray-500 disabled:opacity-50"
                >
                  {new Date(slot.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                  {formatPrice(slot.priceCents, slot.currency)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
