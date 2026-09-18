import type { Role } from '../generated/prisma/enums';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: Role[];
}

export type AuthenticatedUser = AccessTokenPayload;
