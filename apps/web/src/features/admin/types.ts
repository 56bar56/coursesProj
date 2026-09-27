import type { Role } from '../auth/types';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  roles: Role[];
  emailVerified: boolean;
  createdAt: string;
  _count: { coursesOwned: number; enrollments: number };
}

export interface AdminUserList {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface PlatformMetrics {
  users: { total: number; byRole: Record<Role, number> };
  courses: { total: number; byStatus: Record<string, number> };
  enrollments: { total: number };
  reviews: { total: number; hidden: number };
  revenue: { byCurrency: Array<{ currency: string; totalCents: number; orderCount: number }> };
  bookings: { total: number; byStatus: Record<string, number> };
}

export interface PendingCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  ownerInstructor: { id: string; displayName: string; email: string };
  modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string }> }>;
}
