import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { Role } from '../generated/prisma/enums';

const TEST_JWT_SECRET = 'test-secret-at-least-16-chars';
const SIGNUP_CODES: Record<string, string> = {
  SIGNUP_CODE_INSTRUCTOR: 'instructor-code-1234567',
  SIGNUP_CODE_MENTOR: 'mentor-code-1234567890',
  SIGNUP_CODE_ADMIN: 'admin-code-12345678901',
};

describe('AuthService', () => {
  const baseUser = {
    id: 'user-1',
    email: 'student@example.com',
    passwordHash: 'hashed',
    displayName: 'Student',
    roles: [Role.STUDENT],
  };

  function buildService(overrides?: { userFound?: typeof baseUser | null; passwordValid?: boolean }) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(
          overrides?.userFound === undefined ? null : overrides.userFound,
        ),
        create: jest.fn().mockResolvedValue(baseUser),
        update: jest.fn().mockResolvedValue(baseUser),
      },
    };
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return TEST_JWT_SECRET;
        if (key === 'ACCESS_TOKEN_TTL_MIN') return 15;
        if (key in SIGNUP_CODES) return SIGNUP_CODES[key];
        throw new Error(`Unexpected config key in test: ${key}`);
      }),
    };
    const passwordService = {
      hashPassword: jest.fn().mockResolvedValue('hashed'),
      verifyPassword: jest.fn().mockResolvedValue(overrides?.passwordValid ?? true),
    };
    const refreshTokenService = {
      issue: jest.fn().mockResolvedValue({ raw: 'raw-refresh', expiresAt: new Date() }),
      rotate: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    const verificationTokenService = {
      issue: jest.fn().mockResolvedValue('raw-verification'),
      consume: jest.fn(),
    };
    const mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AuthService(
      prisma as any,
      config as any,
      passwordService as any,
      refreshTokenService as any,
      verificationTokenService as any,
      mailService as any,
    );

    return { service, prisma, config, passwordService, refreshTokenService, verificationTokenService, mailService };
  }

  describe('register', () => {
    it('rejects registration when the email is already taken', async () => {
      const { service } = buildService({ userFound: baseUser });
      await expect(
        service.register({ email: baseUser.email, password: 'password123', displayName: 'Student' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('hashes the password, creates the user, and issues tokens', async () => {
      const { service, passwordService, prisma, refreshTokenService, mailService } = buildService({
        userFound: null,
      });

      const result = await service.register({
        email: baseUser.email,
        password: 'password123',
        displayName: 'Student',
      });

      expect(passwordService.hashPassword).toHaveBeenCalledWith('password123');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: baseUser.email }) }),
      );
      expect(mailService.sendVerificationEmail).toHaveBeenCalled();
      expect(refreshTokenService.issue).toHaveBeenCalledWith(baseUser.id);
      expect(jwt.verify(result.accessToken, TEST_JWT_SECRET)).toMatchObject({ sub: baseUser.id, email: baseUser.email });
      expect(result.refreshToken).toBe('raw-refresh');
      expect(prisma.user.create.mock.calls[0][0].data.roles).toBeUndefined();
    });

    it.each([
      [SIGNUP_CODES.SIGNUP_CODE_INSTRUCTOR, Role.INSTRUCTOR],
      [SIGNUP_CODES.SIGNUP_CODE_MENTOR, Role.MENTOR],
      [SIGNUP_CODES.SIGNUP_CODE_ADMIN, Role.ADMIN],
    ])('grants the role matching sign-up code %s', async (signupCode, role) => {
      const { service, prisma } = buildService({ userFound: null });

      await service.register({ email: baseUser.email, password: 'password123', displayName: 'Staff', signupCode });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ roles: [role] }) }),
      );
    });

    it('rejects an invalid sign-up code without creating a user', async () => {
      const { service, prisma } = buildService({ userFound: null });

      await expect(
        service.register({ email: baseUser.email, password: 'password123', displayName: 'X', signupCode: 'wrong' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects when no user exists for the email', async () => {
      const { service } = buildService({ userFound: null });
      await expect(
        service.login({ email: 'missing@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when the password does not match', async () => {
      const { service } = buildService({ userFound: baseUser, passwordValid: false });
      await expect(
        service.login({ email: baseUser.email, password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues tokens on successful login', async () => {
      const { service, refreshTokenService } = buildService({ userFound: baseUser, passwordValid: true });
      const result = await service.login({ email: baseUser.email, password: 'password123' });

      expect(refreshTokenService.issue).toHaveBeenCalledWith(baseUser.id);
      expect(jwt.verify(result.accessToken, TEST_JWT_SECRET)).toMatchObject({ sub: baseUser.id, email: baseUser.email });
      expect(result.user.email).toBe(baseUser.email);
    });
  });
});
