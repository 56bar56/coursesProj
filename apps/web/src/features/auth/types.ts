export type Role = 'STUDENT' | 'INSTRUCTOR' | 'MENTOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  roles: Role[];
  emailVerified: boolean;
  createdAt: string;
}
