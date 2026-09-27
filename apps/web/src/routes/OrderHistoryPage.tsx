import { useTranslation } from 'react-i18next';
import { useOrders } from '../features/payments/hooks';
import { formatPrice } from '../lib/format';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export function OrderHistoryPage() {
  const { t } = useTranslation();
  const { data: orders, isLoading } = useOrders();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t('payments.orders.title')}</h1>

      {isLoading && <p className="mt-6 text-gray-500">…</p>}

      {orders && orders.length === 0 && <p className="mt-6 text-gray-500">{t('payments.orders.empty')}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {orders?.map((order) => (
          <div key={order.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <p className="font-semibold">
                {order.course?.title ?? t('bookings.checkout.title', { mentorName: order.booking?.mentor.displayName })}
              </p>
              <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p>{formatPrice(order.amountCents, order.currency)}</p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status] ?? ''}`}
              >
                {t(`payments.orders.status.${order.status}`)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
