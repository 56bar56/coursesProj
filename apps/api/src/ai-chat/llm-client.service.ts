import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const REQUEST_TIMEOUT_MS = 30_000;
// Headroom for reasoning models (e.g. gpt-oss), whose hidden thinking counts toward this cap.
const MAX_REPLY_TOKENS = 1200;

/**
 * Thin client for any OpenAI-compatible `/chat/completions` endpoint. Groq,
 * Gemini, and Ollama all speak this format, so switching providers is an
 * .env change (AI_BASE_URL/AI_API_KEY/AI_MODEL), not a code change — the same
 * seam idea as PaymentProvider/VideoCallProvider, without needing a second
 * implementation yet.
 */
@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async complete(messages: ChatMessage[]): Promise<string> {
    const baseUrl = this.config.get('AI_BASE_URL', { infer: true }).replace(/\/+$/, '');
    const apiKey = this.config.get('AI_API_KEY', { infer: true })?.trim();
    const model = this.config.get('AI_MODEL', { infer: true });

    // Keyless is only legitimate for a local provider like Ollama.
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|host\.docker\.internal)/.test(baseUrl);
    if (!apiKey && !isLocal) {
      throw new ServiceUnavailableException('AI assistant is not configured');
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: MAX_REPLY_TOKENS }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.warn(`AI request failed: ${(err as Error).message}`);
      throw new BadGatewayException('AI assistant is unavailable right now');
    }

    if (response.status === 429) {
      throw new HttpException('AI assistant is busy, try again in a minute', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!response.ok) {
      // Log the provider's error body server-side only; never forward it (it can echo config details).
      const body = await response.text().catch(() => '');
      this.logger.warn(`AI provider returned ${response.status}: ${body.slice(0, 500)}`);
      throw new BadGatewayException('AI assistant is unavailable right now');
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new BadGatewayException('AI assistant returned an empty reply');
    }
    return content;
  }
}
