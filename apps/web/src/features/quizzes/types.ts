export type QuestionType = 'MULTIPLE_CHOICE' | 'NUMERIC_ENTRY';

export interface AttemptQuestion {
  id: string;
  order: number;
  text: string;
  type: QuestionType;
  options: string[];
}

export interface AttemptStart {
  attemptId: string;
  startedAt: string;
  timeLimitSec: number | null;
  questions: AttemptQuestion[];
}

export interface ReportQuestion extends AttemptQuestion {
  explanation: string | null;
  selectedOptionIndex: number | null;
  numericAnswer: string | null;
  isCorrect: boolean | null;
  timeSpentSec: number | null;
}

export interface AttemptReport {
  attemptId: string;
  startedAt: string;
  submittedAt: string;
  scorePct: number;
  isLate: boolean;
  questions: ReportQuestion[];
}

export interface PastAttempt {
  id: string;
  scorePct: number | null;
  submittedAt: string | null;
  isLate: boolean;
}

export interface AnswerInput {
  questionId: string;
  selectedOptionIndex?: number;
  numericAnswer?: string;
  timeSpentSec?: number;
}
