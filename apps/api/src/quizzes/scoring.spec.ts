import { isAnswerCorrect, numericAnswersMatch } from './scoring';

describe('numericAnswersMatch', () => {
  it('matches identical strings', () => {
    expect(numericAnswersMatch('3', '3')).toBe(true);
  });

  it('matches numerically equal values with different formatting', () => {
    expect(numericAnswersMatch('3', '3.0')).toBe(true);
    expect(numericAnswersMatch('3.0', '3')).toBe(true);
    expect(numericAnswersMatch(' 3 ', '3')).toBe(true);
    expect(numericAnswersMatch('0.5', '.5')).toBe(true);
  });

  it('does not match different numbers', () => {
    expect(numericAnswersMatch('3', '4')).toBe(false);
  });

  it('falls back to trimmed string compare for non-numeric answers', () => {
    expect(numericAnswersMatch('1/2', '1/2')).toBe(true);
    expect(numericAnswersMatch('1/2', ' 1/2 ')).toBe(true);
    expect(numericAnswersMatch('1/2', '2/4')).toBe(false);
  });

  it('returns false when either side is missing', () => {
    expect(numericAnswersMatch(null, '3')).toBe(false);
    expect(numericAnswersMatch('3', undefined)).toBe(false);
  });
});

describe('isAnswerCorrect', () => {
  it('scores a correct multiple-choice answer', () => {
    const question = { id: 'q1', type: 'MULTIPLE_CHOICE' as const, correctOptionIndex: 1, correctNumericAnswer: null };
    expect(isAnswerCorrect(question, { questionId: 'q1', selectedOptionIndex: 1 })).toBe(true);
  });

  it('scores an incorrect multiple-choice answer', () => {
    const question = { id: 'q1', type: 'MULTIPLE_CHOICE' as const, correctOptionIndex: 1, correctNumericAnswer: null };
    expect(isAnswerCorrect(question, { questionId: 'q1', selectedOptionIndex: 0 })).toBe(false);
  });

  it('scores a numeric-entry answer with tolerance', () => {
    const question = { id: 'q1', type: 'NUMERIC_ENTRY' as const, correctOptionIndex: null, correctNumericAnswer: '3' };
    expect(isAnswerCorrect(question, { questionId: 'q1', numericAnswer: '3.0' })).toBe(true);
  });

  it('returns false when no answer was given', () => {
    const question = { id: 'q1', type: 'MULTIPLE_CHOICE' as const, correctOptionIndex: 1, correctNumericAnswer: null };
    expect(isAnswerCorrect(question, undefined)).toBe(false);
  });

  it('returns false for multiple-choice when correctOptionIndex is unset', () => {
    const question = { id: 'q1', type: 'MULTIPLE_CHOICE' as const, correctOptionIndex: null, correctNumericAnswer: null };
    expect(isAnswerCorrect(question, { questionId: 'q1', selectedOptionIndex: 0 })).toBe(false);
  });
});
