import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'he', label: 'עברית' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex gap-2">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => i18n.changeLanguage(lang.code)}
          className={
            i18n.resolvedLanguage === lang.code
              ? 'font-semibold underline'
              : 'text-gray-500 hover:text-gray-900'
          }
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
