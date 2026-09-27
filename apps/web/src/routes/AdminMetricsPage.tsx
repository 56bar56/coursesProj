import { useTranslation } from 'react-i18next';
import { usePlatformMetrics } from '../features/admin/hooks';
import { formatPrice } from '../lib/format';

function StatCard({ title, value, breakdown }: { title: string; value: number; breakdown?: Record<string, number> }) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {breakdown && (
        <ul className="mt-3 flex flex-col gap-1 text-xs text-gray-500">
          {Object.entries(breakdown).map(([key, count]) => (
            <li key={key} className="flex justify-between">
              <span>{key}</span>
              <span>{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminMetricsPage() {
  const { t } = useTranslation();
  const { data: metrics, isLoading } = usePlatformMetrics();

  if (isLoading || !metrics) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t('admin.metrics.title')}</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title={t('admin.metrics.totalUsers')} value={metrics.users.total} breakdown={metrics.users.byRole} />
        <StatCard
          title={t('admin.metrics.totalCourses')}
          value={metrics.courses.total}
          breakdown={metrics.courses.byStatus}
        />
        <StatCard title={t('admin.metrics.totalEnrollments')} value={metrics.enrollments.total} />
        <StatCard
          title={t('admin.metrics.totalReviews')}
          value={metrics.reviews.total}
          breakdown={{ hidden: metrics.reviews.hidden }}
        />
        <StatCard
          title={t('admin.metrics.totalBookings')}
          value={metrics.bookings.total}
          breakdown={metrics.bookings.byStatus}
        />
        <div className="rounded-md border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{t('admin.metrics.revenue')}</p>
          {metrics.revenue.byCurrency.length === 0 ? (
            <p className="mt-1 text-sm text-gray-400">{t('admin.metrics.noRevenue')}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {metrics.revenue.byCurrency.map((row) => (
                <li key={row.currency} className="flex justify-between">
                  <span>{formatPrice(row.totalCents, row.currency)}</span>
                  <span className="text-gray-500">
                    {t('admin.metrics.orderCount', { count: row.orderCount })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
