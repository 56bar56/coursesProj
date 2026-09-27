import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStartAttempt, usePastAttempts } from './hooks';
import type { AttemptStart } from './types';

interface QuizIntroProps {
  quizId: string;
  timeLimitSec: number | null;
  questionCount: number;
  onStart: (attempt: AttemptStart) => void;
}

export function QuizIntro({ quizId, timeLimitSec, questionCount, onStart }: QuizIntroProps) {
  const { t } = useTranslation();
  const { data: pastAttempts } = usePastAttempts(quizId);
  const startAttempt = useStartAttempt();
  const [error, setError] = useState<string | null>(null);

  function handleStart() {
    setError(null);
    startAttempt.mutate(quizId, {
      onSuccess: onStart,
      onError: () => setError(t('courses.player.quiz.startError')),
    });
  }

  return (
    <div className="rounded-md border border-gray-200 p-4">
      <p className="text-sm text-gray-600">{t('courses.player.quiz.questionCount', { count: questionCount })}</p>
      {timeLimitSec != null && (
        <p className="text-sm text-gray-600">
          {t('courses.player.quiz.timeLimit', { minutes: Math.round(timeLimitSec / 60) })}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={startAttempt.isPending}
        onClick={handleStart}
        className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {t('courses.player.quiz.start')}
      </button>

      {pastAttempts && pastAttempts.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-500">{t('courses.player.quiz.pastAttempts')}</h3>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
            {pastAttempts.map((a) => (
              <li key={a.id}>
                {t('courses.player.quiz.score', { percent: a.scorePct ?? 0 })}
                {a.isLate ? ` (${t('courses.player.quiz.late')})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
