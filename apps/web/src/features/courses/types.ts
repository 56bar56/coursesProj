export type LessonType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'RESOURCE';

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  language: string;
  priceCents: number;
  currency: string;
  isFree: boolean;
}

export interface CourseList {
  items: CourseSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface LessonOutline {
  id: string;
  title: string;
  type: LessonType;
  order: number;
  durationSec: number | null;
}

export interface ModuleOutline {
  id: string;
  title: string;
  order: number;
  lessons: LessonOutline[];
}

export interface CourseDetail extends CourseSummary {
  modules: ModuleOutline[];
}

export interface Enrollment {
  id: string;
  progressPct: number;
  completedAt: string | null;
  enrolledAt: string;
  course: CourseSummary;
}

interface LessonBase {
  id: string;
  title: string;
}

export type LessonContent =
  | (LessonBase & { type: 'TEXT'; textContent: string | null })
  | (LessonBase & {
      type: 'VIDEO';
      streamUrl: string | null;
      durationSec: number | null;
      lastPositionSec: number | null;
    })
  | (LessonBase & {
      type: 'RESOURCE';
      downloadUrl: string | null;
      fileName: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
    })
  | (LessonBase & { type: 'QUIZ'; comingSoon: true })
  | (LessonBase & { type: 'QUIZ'; quizId: string; timeLimitSec: number | null; questionCount: number });

export interface CourseProgress {
  progressPct: number;
  completedLessonIds: string[];
}
