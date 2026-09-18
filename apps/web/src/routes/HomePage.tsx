import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">{t('home.title')}</h1>
      <p className="mt-4 text-gray-600">{t('home.subtitle')}</p>
    </div>
  );
}
