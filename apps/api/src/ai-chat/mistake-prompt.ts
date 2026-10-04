import type { ChatMessage } from './llm-client.service';

export interface MistakeContext {
  questionText: string;
  type: 'MULTIPLE_CHOICE' | 'NUMERIC_ENTRY';
  options: string[];
  correctOptionIndex: number | null;
  correctNumericAnswer: string | null;
  selectedOptionIndex: number | null;
  numericAnswer: string | null;
  isCorrect: boolean | null;
  explanation: string | null;
  courseTitle: string;
  locale: 'en' | 'he';
}

function describeStudentAnswer(ctx: MistakeContext): string {
  if (ctx.type === 'MULTIPLE_CHOICE') {
    return ctx.selectedOptionIndex != null && ctx.options[ctx.selectedOptionIndex] !== undefined
      ? `"${ctx.options[ctx.selectedOptionIndex]}"`
      : '(no answer given)';
  }
  return ctx.numericAnswer?.trim() ? `"${ctx.numericAnswer.trim()}"` : '(no answer given)';
}

function describeCorrectAnswer(ctx: MistakeContext): string {
  if (ctx.type === 'MULTIPLE_CHOICE') {
    return ctx.correctOptionIndex != null ? `"${ctx.options[ctx.correctOptionIndex]}"` : '(not recorded)';
  }
  return ctx.correctNumericAnswer != null ? `"${ctx.correctNumericAnswer}"` : '(not recorded)';
}

/**
 * The system prompt is grounded in the DB's own answer key and instructor
 * explanation, so the model explains *the* correct answer rather than
 * deriving (and possibly hallucinating) its own.
 */
export function buildSystemPrompt(ctx: MistakeContext): string {
  const language = ctx.locale === 'he' ? 'Hebrew' : 'English';
  const lines = [
    `You are a patient tutor on an online learning platform, helping a student understand a quiz question from the course "${ctx.courseTitle}".`,
    `Always reply in ${language}.`,
    '',
    'Quiz question:',
    ctx.questionText,
  ];
  if (ctx.type === 'MULTIPLE_CHOICE') {
    lines.push('', 'Options:', ...ctx.options.map((opt, i) => `${i + 1}. ${opt}`));
  }
  lines.push(
    '',
    `Student's answer: ${describeStudentAnswer(ctx)}`,
    `Correct answer: ${describeCorrectAnswer(ctx)}`,
    `The student's answer was marked ${ctx.isCorrect ? 'correct' : 'incorrect'}.`,
  );
  if (ctx.explanation) {
    lines.push(`Instructor's explanation: ${ctx.explanation}`);
  }
  lines.push(
    '',
    'Guidelines:',
    '- Treat the correct answer above as authoritative; never contradict it.',
    "- First explain the likely reasoning mistake behind the student's answer, then walk through how to reach the correct answer step by step.",
    '- Be encouraging and concise (under about 200 words unless asked for more).',
    '- Your reply is shown as plain text: no markdown, no LaTeX. Write math inline in plain form, e.g. x^2 + 3x = 10, sqrt(2), 3/4.',
    '- Answer follow-up questions about this question and the concepts behind it. Politely decline unrelated requests and steer back to the question.',
  );
  return lines.join('\n');
}

export function initialUserPrompt(locale: 'en' | 'he'): string {
  return locale === 'he'
    ? 'למה התשובה שלי שגויה, ואיך מגיעים לתשובה הנכונה?'
    : 'Why was my answer wrong, and how do I get to the correct answer?';
}

export function buildMessages(
  ctx: MistakeContext,
  history: { role: 'user' | 'assistant'; content: string }[],
): ChatMessage[] {
  const turns = history.length > 0 ? history : [{ role: 'user' as const, content: initialUserPrompt(ctx.locale) }];
  return [{ role: 'system', content: buildSystemPrompt(ctx) }, ...turns];
}
