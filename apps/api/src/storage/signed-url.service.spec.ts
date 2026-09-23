import { UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { SignedUrlService } from './signed-url.service';

describe('SignedUrlService', () => {
  function buildService() {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'STORAGE_SIGNING_SECRET') return 'test-storage-secret-at-least-16';
        if (key === 'SIGNED_URL_TTL_SECONDS') return 900;
        throw new Error(`Unexpected config key in test: ${key}`);
      }),
    };
    return new SignedUrlService(config as any);
  }

  it('signs and verifies a round trip for the matching purpose', () => {
    const service = buildService();
    const token = service.sign({ lessonId: 'lesson-1', userId: 'user-1', purpose: 'stream' });
    const payload = service.verify(token, 'stream');
    expect(payload).toMatchObject({ lessonId: 'lesson-1', userId: 'user-1', purpose: 'stream' });
  });

  it('rejects a token used for the wrong purpose', () => {
    const service = buildService();
    const token = service.sign({ lessonId: 'lesson-1', userId: 'user-1', purpose: 'stream' });
    expect(() => service.verify(token, 'download')).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', () => {
    const service = buildService();
    const token = service.sign({ lessonId: 'lesson-1', userId: 'user-1', purpose: 'stream' }, -1);
    expect(() => service.verify(token, 'stream')).toThrow(UnauthorizedException);
  });

  it('rejects a tampered token', () => {
    const service = buildService();
    const token = service.sign({ lessonId: 'lesson-1', userId: 'user-1', purpose: 'stream' });
    const tampered = token.slice(0, -2) + (token.at(-2) === 'a' ? 'b' : 'a') + token.at(-1);
    expect(() => service.verify(tampered, 'stream')).toThrow(UnauthorizedException);
  });

  it('rejects a token signed with a different secret', () => {
    const service = buildService();
    const foreignToken = jwt.sign({ lessonId: 'lesson-1', userId: 'user-1', purpose: 'stream' }, 'someone-elses-secret');
    expect(() => service.verify(foreignToken, 'stream')).toThrow(UnauthorizedException);
  });
});
