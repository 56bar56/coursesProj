/**
 * Fixed allowlist rather than a Prisma enum: `CoursesService.list()` filters
 * category by exact match, so free-text instructor input would fragment the
 * catalogue ("Math" vs "math"). An enum would need a migration every time
 * this list changes; a plain allowlist doesn't.
 */
export const COURSE_CATEGORIES = [
  'math',
  'psychometric',
  'drawing',
  'programming',
  'science',
  'language',
  'business',
  'other',
] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];
