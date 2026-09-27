export interface ScorableQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'NUMERIC_ENTRY';
  correctOptionIndex: number | null;
  correctNumericAnswer: string | null;
}

export interface SubmittedAnswer {
  questionId: string;
  selectedOptionIndex?: number;
  numericAnswer?: string;
  timeSpentSec?: number;
}

const NUMERIC_EPSILON = 1e-9;

/**
 * Numeric answers are compared with tolerance, not raw string equality —
 * "3", "3.0", and " 3 " are all the same correct answer for math/psychometric
 * practice, and a naive === would silently mis-grade them.
 */
export function numericAnswersMatch(correct: string | null, submitted: string | undefined): boolean {
  if (correct === null || submitted === undefined) {
    return false;
  }
  const correctTrimmed = correct.trim();
  const submittedTrimmed = submitted.trim();
  const correctNum = Number.parseFloat(correctTrimmed);
  const submittedNum = Number.parseFloat(submittedTrimmed);
  if (!Number.isNaN(correctNum) && !Number.isNaN(submittedNum)) {
    return Math.abs(correctNum - submittedNum) < NUMERIC_EPSILON;
  }
  return correctTrimmed === submittedTrimmed;
}

export function isAnswerCorrect(question: ScorableQuestion, answer: SubmittedAnswer | undefined): boolean {
  if (!answer) {
    return false;
  }
  if (question.type === 'MULTIPLE_CHOICE') {
    return question.correctOptionIndex !== null && answer.selectedOptionIndex === question.correctOptionIndex;
  }
  return numericAnswersMatch(question.correctNumericAnswer, answer.numericAnswer);
}
