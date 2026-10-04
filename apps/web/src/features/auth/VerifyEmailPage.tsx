import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVerifyEmail } from './hooks';
import { ApiError } from '../../lib/api-client';

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const verify = useVerifyEmail();
  // Tokens are single-use, so don't send it twice (React StrictMode re-runs effects).
  const sent = useRef(false);

  useEffect(() => {
    if (token && !sent.current) {
      sent.current = true;
      verify.mutate(token);
    }
  }, [token, verify]);

  let message: string;
  if (!token) {
    message = t('verifyEmail.missingToken');
  } else if (verify.isSuccess) {
    message = t('verifyEmail.success');
  } else if (verify.isError) {
    message = verify.error instanceof ApiError ? verify.error.message : t('auth.genericError');
  } else {
    message = t('verifyEmail.pending');
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('verifyEmail.title')}</h1>
      <p className={verify.isError || !token ? 'text-sm text-red-600' : 'text-sm text-gray-600'}>{message}</p>
      {verify.isSuccess && (
        <Link to="/dashboard" className="underline">
          {t('verifyEmail.toDashboard')}
        </Link>
      )}
    </div>
  );
}
