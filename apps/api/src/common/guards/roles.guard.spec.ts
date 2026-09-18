import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../generated/prisma/enums';

function buildContext(user: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  function buildGuard(requiredRoles: Role[] | undefined) {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(requiredRoles) } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it('allows the request when no roles are required', () => {
    const guard = buildGuard(undefined);
    expect(guard.canActivate(buildContext(undefined))).toBe(true);
  });

  it('throws when the route requires roles but there is no authenticated user', () => {
    const guard = buildGuard([Role.ADMIN]);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });

  it('throws when the user lacks the required role', () => {
    const guard = buildGuard([Role.ADMIN]);
    expect(() => guard.canActivate(buildContext({ roles: [Role.STUDENT] }))).toThrow(ForbiddenException);
  });

  it('allows the request when the user has one of the required roles', () => {
    const guard = buildGuard([Role.ADMIN, Role.INSTRUCTOR]);
    expect(guard.canActivate(buildContext({ roles: [Role.INSTRUCTOR] }))).toBe(true);
  });
});
