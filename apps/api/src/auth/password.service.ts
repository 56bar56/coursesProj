import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

// OWASP-recommended Argon2id baseline: memoryCost in KiB, timeCost iterations, parallelism.
const HASH_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService {
  hashPassword(plain: string): Promise<string> {
    return hash(plain, HASH_OPTIONS);
  }

  verifyPassword(hashed: string, plain: string): Promise<boolean> {
    return verify(hashed, plain);
  }
}
