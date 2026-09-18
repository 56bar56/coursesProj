import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMe, useLogout } from '../features/auth/hooks';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Layout() {
  const { t } = useTranslation();
  const { data: user } = useMe();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-4 py-3">
        <nav className="flex items-center gap-4">
          <Link to="/" className="font-semibold">
            {t('nav.home')}
          </Link>
          {user && (
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
              {t('nav.dashboard')}
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-4">
          {user ? (
            <button type="button" onClick={() => logout.mutate()} className="text-gray-600 hover:text-gray-900">
              {t('nav.logout')}
            </button>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="text-gray-600 hover:text-gray-900">
                {t('nav.register')}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
