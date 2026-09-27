import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MistakeChat } from '../ai-chat/MistakeChat';
import type { AttemptReport } from './types';

interface ScoreReportProps {
  report: AttemptReport;
}

export function ScoreReport({ report }: ScoreReportProps) {
  const { t } = useTranslation();
  const [openChats, setOpenChats] = useState<Set<string>>(new Set());
  const [startedChats, setStartedChats] = useState<Set<string>>(new Set());

  function toggleChat(questionId: string) {
    setStartedChats((prev) => (prev.has(questionId) ? prev : new Set(prev).add(questionId)));
    setOpenChats((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  return (
    <div>
      <p className="text-2xl font-semibold">{t('courses.player.quiz.score', { percent: report.scorePct })}</p>
      {report.isLate && <p className="mt-1 text-sm text-yellow-700">{t('courses.player.quiz.lateSubmission')}</p>}

      <ol className="mt-6 flex flex-col gap-4">
        {report.questions.map((q, index) => (
          <li
            key={q.id}
            className={`rounded-md border p-3 ${q.isCorrect ? 'border-green-200' : 'border-red-200'}`}
          >
            <p className="font-medium">
              {index + 1}. {q.text}
            </p>

            {q.type === 'MULTIPLE_CHOICE' ? (
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {q.options.map((opt, idx) => (
                  <li key={idx} className={idx === q.selectedOptionIndex ? 'font-semibold' : 'text-gray-600'}>
                    {opt}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-600">
                {t('courses.player.quiz.yourAnswer')}: {q.numericAnswer ?? '—'}
              </p>
            )}

            <p className={`mt-2 text-sm font-medium ${q.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {q.isCorrect ? t('courses.player.quiz.correct') : t('courses.player.quiz.incorrect')}
            </p>
            {q.explanation && <p className="mt-1 text-sm text-gray-600">{q.explanation}</p>}

            {!q.isCorrect && (
              <>
                <button
                  type="button"
                  onClick={() => toggleChat(q.id)}
                  className="mt-2 text-sm font-medium text-gray-900 underline"
                >
                  {openChats.has(q.id) ? t('aiChat.hide') : t('aiChat.whyWrong')}
                </button>
                {/* Kept mounted while hidden so closing/reopening doesn't lose the conversation or re-query the AI. */}
                {startedChats.has(q.id) && (
                  <div hidden={!openChats.has(q.id)}>
                    <MistakeChat attemptId={report.attemptId} questionId={q.id} />
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
