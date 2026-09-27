export type InstructorCourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

export interface InstructorCourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  language: string;
  priceCents: number;
  currency: string;
  status: InstructorCourseStatus;
  rejectionReason: string | null;
  createdAt: string;
}

export interface InstructorLesson {
  id: string;
  title: string;
  type: 'TEXT';
  textContent: string | null;
  order: number;
}

export interface InstructorModule {
  id: string;
  title: string;
  order: number;
  lessons: InstructorLesson[];
}

export interface InstructorCourseDetail extends InstructorCourseSummary {
  modules: InstructorModule[];
}

export interface CreateCourseInput {
  title: string;
  description: string;
  category: string;
  language?: string;
  priceCents?: number;
  currency?: string;
}

export type UpdateCourseInput = Partial<CreateCourseInput>;
