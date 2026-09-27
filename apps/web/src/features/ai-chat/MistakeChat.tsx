import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api-client';
import { useExplainMistake } from './hooks';
import type { ChatTurn } from './types';

// Mirrors the server's MAX_CHAT_MESSAGES cap on resent history.
const MAX_MESSAGES = 20;

interface MistakeChatProps {
  attemptId: string;
  questionId: string;
}

export function MistakeChat({ attemptId, questionId }: MistakeChatProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'he' ? 'he' : 'en';
  const explain = useExplainMistake(attemptId, questionId);
  // `messages` is what the student sees; the very first request is sent with
  // empty history and the server supplies the opening question itself.
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const requestedInitial = useRef(false);

  function send(history: ChatTurn[]) {
    explain.mutate(
      { messages: history, locale },
      { onSuccess: ({ reply }) => setMessages([...history, { role: 'assistant', content: reply }]) },
    );
  }

  useEffect(() => {
    // Guard against StrictMode's double effect run firing two AI requests.
    if (requestedInitial.current) return;
    requestedInitial.current = true;
    send([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || explain.isPending) return;
    const history: ChatTurn[] = [...messages, { role: 'user', content: text }];
    setMessages(history);
    setDraft('');
    send(history);
  }

  const atLimit = messages.length >= MAX_MESSAGES - 1;
  const errorMessage =
    explain.error instanceof ApiError
      ? explain.error.status === 429
        ? t('aiChat.rateLimited')
        : explain.error.status === 503
          ? t('aiChat.notConfigured')
          : t('aiChat.error')
      : explain.error
        ? t('aiChat.error')
        : null;

  return (
    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
      <ul className="flex flex-col gap-2 text-sm">
        {messages.map((m, idx) => (
          <li
            key={idx}
            className={
              m.role === 'assistant'
                ? 'whitespace-pre-line rounded-md bg-white p-2 text-gray-800'
                : 'self-end rounded-md bg-gray-900 px-3 py-2 text-white'
            }
          >
            {m.content}
          </li>
        ))}
        {explain.isPending && <li className="text-gray-500">{t('aiChat.thinking')}</li>}
      </ul>

      {errorMessage && (
        <p className="mt-2 text-sm text-red-700">
          {errorMessage}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => send(messages.length > 0 && messages[messages.length - 1].role === 'user' ? messages : [])}
          >
            {t('aiChat.retry')}
          </button>
        </p>
      )}

      {messages.length > 0 && !atLimit && (
        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            placeholder={t('aiChat.placeholder')}
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={!draft.trim() || explain.isPending}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {t('aiChat.send')}
          </button>
        </form>
      )}
      {atLimit && <p className="mt-2 text-xs text-gray-500">{t('aiChat.limitReached')}</p>}
      <p className="mt-2 text-xs text-gray-400">{t('aiChat.disclaimer')}</p>
    </div>
  );
}
