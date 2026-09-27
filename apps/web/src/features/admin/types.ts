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
