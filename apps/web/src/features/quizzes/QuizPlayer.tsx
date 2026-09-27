import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubmitAttempt } from './hooks';
import type { AnswerInput, AttemptReport, AttemptStart } from './types';
import { formatMinutesSeconds } from '../../lib/format';

interface QuizPlayerProps {
  attempt: AttemptStart;
  onSubmitted: (report: AttemptReport) => void;
}

export function QuizPlayer({ attempt, onSubmitted }: QuizPlayerProps) {
  const { t } = useTranslation();
  const submitAttempt = useSubmitAttempt();
  const [answers, setAnswers] = useState<Record<string, AnswerInput>>({});
  const hasSubmittedRef = useRef(false);

  const deadline = useMemo(
    () => (attempt.timeLimitSec != null ? new Date(attempt.startedAt).getTime() + attempt.timeLimitSec * 1000 : null),
    [attempt.startedAt, attempt.timeLimitSec],
  );
  const [remainingSec, setRemainingSec] = useState<number | null>(
    deadline !== null ? Math.max(0, Math.round((deadline - Date.now()) / 1000)) : null,
  );

  const doSubmit = useCallback(() => {
    if (hasSubmittedRef.current) {
      return;
    }
    hasSubmittedRef.current = true;
    submitAttempt.mutate(
      { attemptId: attempt.attemptId, answers: Object.values(answers) },
      { onSuccess: onSubmitted },
    );
  }, [answers, attempt.attemptId, submitAttempt, onSubmitted]);

  useEffect(() => {
    if (deadline === null) {
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemainingSec(remaining);
      if (remaining <= 0) {
        doSubmit();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, doSubmit]);

  function setAnswer(questionId: string, patch: Partial<AnswerInput>) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], questionId, ...patch } }));
  }

  return (
    <div>
      {remainingSec !== null && (
        <p className="font-mono text-lg">{t('courses.player.quiz.timeRemaining', { time: formatMinutesSeconds(remainingSec) })}</p>
      )}

      <ol className="mt-4 flex flex-col gap-6">
        {attempt.questions.map((q, index) => (
          <li key={q.id}>
            <p className="font-medium">
              {index + 1}. {q.text}
            </p>
            {q.type === 'MULTIPLE_CHOICE' ? (
              <div className="mt-2 flex flex-col gap-1">
                {q.options.map((opt, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id]?.selectedOptionIndex === idx}
                      onChange={() => setAnswer(q.id, { selectedOptionIndex: idx })}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={answers[q.id]?.numericAnswer ?? ''}
                onChange={(e) => setAnswer(q.id, { numericAnswer: e.target.value })}
                className="mt-2 rounded-md border border-gray-300 px-3 py-1.5"
              />
            )}
          </li>
        ))}
      </ol>

      <button
        type="button"
        disabled={submitAttempt.isPending}
        onClick={doSubmit}
        className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {t('courses.player.quiz.submit')}
      </button>
    </div>
  );
}
