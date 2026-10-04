import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  const baseEnv = {
    DATABASE_URL: 'postgresql://localhost/test',
    FRONTEND_URL: 'http://localhost:5173',
    JWT_ACCESS_SECRET: 'a'.repeat(16),
    JWT_REFRESH_SECRET: 'b'.repeat(16),
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_FROM: 'test@example.com',
    STORAGE_SIGNING_SECRET: 'c'.repeat(16),
    PAYMENTS_FAKE_WEBHOOK_SECRET: 'd'.repeat(16),
  };

  it('accepts distinct sign-up codes and treats empty ones as unset', () => {
    const env = validateEnv({
      ...baseEnv,
      SIGNUP_CODE_INSTRUCTOR: 'instructor-code-1234567',
      SIGNUP_CODE_MENTOR: '',
      SIGNUP_CODE_ADMIN: 'admin-code-12345678901',
    });
    expect(env.SIGNUP_CODE_MENTOR).toBeUndefined();
  });

  it('rejects the same sign-up code configured for two roles', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        SIGNUP_CODE_INSTRUCTOR: 'shared-code-1234567890',
        SIGNUP_CODE_ADMIN: 'shared-code-1234567890',
      }),
    ).toThrow(/SIGNUP_CODE_ADMIN must differ from SIGNUP_CODE_INSTRUCTOR/);
  });

  it('rejects sign-up codes shorter than 16 characters', () => {
    expect(() => validateEnv({ ...baseEnv, SIGNUP_CODE_MENTOR: 'short' })).toThrow(/SIGNUP_CODE_MENTOR/);
  });
});
