import { useState } from 'react';
import { QuizIntro } from './QuizIntro';
import { QuizPlayer } from './QuizPlayer';
import { ScoreReport } from './ScoreReport';
import type { AttemptReport, AttemptStart } from './types';

interface QuizSectionProps {
  quizId: string;
  timeLimitSec: number | null;
  questionCount: number;
}

export function QuizSection({ quizId, timeLimitSec, questionCount }: QuizSectionProps) {
  const [attempt, setAttempt] = useState<AttemptStart | null>(null);
  const [report, setReport] = useState<AttemptReport | null>(null);

  if (report) {
    return <ScoreReport report={report} />;
  }
  if (attempt) {
    return <QuizPlayer attempt={attempt} onSubmitted={setReport} />;
  }
  return <QuizIntro quizId={quizId} timeLimitSec={timeLimitSec} questionCount={questionCount} onStart={setAttempt} />;
}
