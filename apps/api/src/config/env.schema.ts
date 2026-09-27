import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  FRONTEND_URL: z.url(),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_FROM: z.string().min(1),

  SEED_ADMIN_EMAIL: z.email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_INSTRUCTOR_EMAIL: z.email().optional(),
  SEED_INSTRUCTOR_PASSWORD: z.string().min(8).optional(),
  SEED_MENTOR_EMAIL: z.email().optional(),
  SEED_MENTOR_PASSWORD: z.string().min(8).optional(),

  STORAGE_SIGNING_SECRET: z.string().min(16, 'STORAGE_SIGNING_SECRET must be at least 16 characters'),
  LOCAL_STORAGE_DIR: z.string().min(1).default('./local-uploads'),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  PAYMENT_PROVIDER: z.enum(['fake']).default('fake'),
  PAYMENTS_FAKE_WEBHOOK_SECRET: z.string().min(16, 'PAYMENTS_FAKE_WEBHOOK_SECRET must be at least 16 characters'),

  // Any OpenAI-compatible chat-completions API (Groq, Gemini, Ollama, ...).
  // AI_API_KEY is optional so the app still boots without it (the AI endpoint
  // returns 503 instead) and so keyless local providers like Ollama work.
  AI_BASE_URL: z.url().default('https://api.groq.com/openai/v1'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().min(1).default('openai/gpt-oss-120b'),
  AI_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(10),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${parsed.error.message}`);
  }
  return parsed.data;
}
