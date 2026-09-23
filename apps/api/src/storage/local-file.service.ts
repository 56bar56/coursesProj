import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';
import type { Env } from '../config/env.schema';

export type StorageSubdir = 'videos' | 'resources';

@Injectable()
export class LocalFileService {
  private readonly baseDir: string;

  constructor(config: ConfigService<Env, true>) {
    this.baseDir = resolve(config.get('LOCAL_STORAGE_DIR', { infer: true }));
  }

  ensureDirs(): void {
    for (const subdir of ['videos', 'resources'] as const) {
      const dir = join(this.baseDir, subdir);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /** Resolves a storage key to an absolute path, rejecting any attempt to escape the base directory. */
  resolvePath(subdir: StorageSubdir, key: string): string {
    const full = normalize(join(this.baseDir, subdir, key));
    if (!full.startsWith(join(this.baseDir, subdir) + sep) && full !== join(this.baseDir, subdir)) {
      throw new InternalServerErrorException('Invalid storage key');
    }
    return full;
  }
}
