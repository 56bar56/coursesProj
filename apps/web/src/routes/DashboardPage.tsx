import { useTranslation } from 'react-i18next';
import { useMe } from '../features/auth/hooks';

export function DashboardPage() {
  const { t } = useTranslation();
  const { data: user } = useMe();

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('dashboard.welcome', { name: user.displayName })}</h1>
      <dl className="mt-6 flex flex-col gap-3 text-sm">
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <dt className="text-gray-500">{t('dashboard.email')}</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <dt className="text-gray-500">{t('dashboard.roles')}</dt>
          <dd>{user.roles.join(', ')}</dd>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <dt className="text-gray-500">{t('dashboard.emailVerified')}</dt>
          <dd>{user.emailVerified ? t('dashboard.yes') : t('dashboard.no')}</dd>
        </div>
      </dl>
    </div>
  );
}
