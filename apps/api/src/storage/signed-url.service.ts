import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { Env } from '../config/env.schema';

export type StoragePurpose = 'stream' | 'download';

export interface StorageTokenPayload {
  lessonId: string;
  userId: string;
  purpose: StoragePurpose;
}

@Injectable()
export class SignedUrlService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  sign(payload: StorageTokenPayload, ttlSeconds?: number): string {
    const secret = this.config.get('STORAGE_SIGNING_SECRET', { infer: true });
    const expiresIn = ttlSeconds ?? this.config.get('SIGNED_URL_TTL_SECONDS', { infer: true });
    return jwt.sign(payload, secret, { expiresIn });
  }

  verify(token: string, purpose: StoragePurpose): StorageTokenPayload {
    const secret = this.config.get('STORAGE_SIGNING_SECRET', { infer: true });
    let payload: StorageTokenPayload;
    try {
      payload = jwt.verify(token, secret) as StorageTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired storage token');
    }
    if (payload.purpose !== purpose) {
      throw new UnauthorizedException('Storage token not valid for this operation');
    }
    return payload;
  }
}
