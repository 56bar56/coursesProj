import { FixedWindowRateLimiter } from './rate-limiter';
import { buildMessages, buildSystemPrompt, type MistakeContext } from './mistake-prompt';

const baseCtx: MistakeContext = {
  questionText: 'What is 2 + 2?',
  type: 'MULTIPLE_CHOICE',
  options: ['3', '4', '5'],
  correctOptionIndex: 1,
  correctNumericAnswer: null,
  selectedOptionIndex: 2,
  numericAnswer: null,
  isCorrect: false,
  explanation: 'Two plus two is four.',
  courseTitle: 'Intro to Math',
  locale: 'en',
};

describe('FixedWindowRateLimiter', () => {
  it('allows up to the limit per window, then blocks, then resets', () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(2, 60_000, () => now);
    expect(limiter.tryConsume('u1')).toBe(true);
    expect(limiter.tryConsume('u1')).toBe(true);
    expect(limiter.tryConsume('u1')).toBe(false);
    expect(limiter.tryConsume('u2')).toBe(true);
    now = 60_000;
    expect(limiter.tryConsume('u1')).toBe(true);
  });
});

describe('mistake prompt', () => {
  it('grounds the prompt in the stored answer key and the student answer', () => {
    const prompt = buildSystemPrompt(baseCtx);
    expect(prompt).toContain('Correct answer: "4"');
    expect(prompt).toContain('Student\'s answer: "5"');
    expect(prompt).toContain('Two plus two is four.');
    expect(prompt).toContain('reply in English');
  });

  it('handles numeric and unanswered questions, and Hebrew', () => {
    const prompt = buildSystemPrompt({
      ...baseCtx,
      type: 'NUMERIC_ENTRY',
      options: [],
      correctOptionIndex: null,
      correctNumericAnswer: '4',
      selectedOptionIndex: null,
      numericAnswer: null,
      locale: 'he',
    });
    expect(prompt).toContain('Correct answer: "4"');
    expect(prompt).toContain('(no answer given)');
    expect(prompt).toContain('reply in Hebrew');
  });

  it('seeds an initial question when history is empty, else passes history through', () => {
    const initial = buildMessages(baseCtx, []);
    expect(initial.map((m) => m.role)).toEqual(['system', 'user']);

    const history = [
      { role: 'user' as const, content: 'why?' },
      { role: 'assistant' as const, content: 'because' },
      { role: 'user' as const, content: 'more?' },
    ];
    expect(buildMessages(baseCtx, history).slice(1)).toEqual(history);
  });
});
