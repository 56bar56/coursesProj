import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOrder, useSimulateOutcome } from '../features/payments/hooks';
import { formatPrice } from '../lib/format';

export function FakeCheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading } = useOrder(orderId);
  const simulate = useSimulateOutcome();
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !order) {
    return null;
  }

  const isBooking = order.booking !== null;

  function handleSimulate(outcome: 'success' | 'failure') {
    setError(null);
    simulate.mutate(
      { orderId: order!.id, outcome },
      {
        onSuccess: () => navigate(isBooking ? '/bookings' : '/orders'),
        onError: () => setError(t('payments.checkout.simulateError')),
      },
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm text-gray-500">{t('payments.checkout.title')}</p>
      <h1 className="mt-2 text-2xl font-semibold">
        {order.course?.title ?? t('bookings.checkout.title', { mentorName: order.booking?.mentor.displayName })}
      </h1>
      <p className="mt-2 text-lg">{formatPrice(order.amountCents, order.currency)}</p>
      <p className="mt-4 text-sm text-gray-500">{t('payments.checkout.description')}</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          disabled={simulate.isPending}
          onClick={() => handleSimulate('success')}
          className="rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {t('payments.checkout.simulateSuccess')}
        </button>
        <button
          type="button"
          disabled={simulate.isPending}
          onClick={() => handleSimulate('failure')}
          className="rounded-md border border-gray-300 px-4 py-2 disabled:opacity-50"
        >
          {t('payments.checkout.simulateFailure')}
        </button>
      </div>
    </div>
  );
}
