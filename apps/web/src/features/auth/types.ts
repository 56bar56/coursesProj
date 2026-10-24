export type Role = 'STUDENT' | 'INSTRUCTOR' | 'MENTOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  roles: Role[];
  emailVerified: boolean;
  // Staff role from a sign-up code, granted once the email is verified.
  pendingRole: Role | null;
  createdAt: string;
}
