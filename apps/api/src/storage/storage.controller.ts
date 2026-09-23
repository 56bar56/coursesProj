import { Controller, Get, NotFoundException, Param, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { PrismaService } from '../prisma/prisma.service';
import { LocalFileService } from './local-file.service';
import { SignedUrlService } from './signed-url.service';

@Controller('storage')
export class StorageController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signedUrl: SignedUrlService,
    private readonly localFile: LocalFileService,
  ) {}

  @Get('stream/:lessonId')
  async stream(
    @Param('lessonId') lessonId: string,
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const payload = this.signedUrl.verify(token, 'stream');
    if (payload.lessonId !== lessonId) {
      throw new UnauthorizedException('Storage token does not match lesson');
    }

    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || lesson.type !== 'VIDEO' || !lesson.storageKey) {
      throw new NotFoundException('Video not found');
    }

    const filePath = this.localFile.resolvePath('videos', lesson.storageKey);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Video file not found on disk');
    }

    const stat = statSync(filePath);
    const mimeType = lesson.mimeType ?? 'video/mp4';
    const range = req.headers.range;

    if (!range) {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });
      createReadStream(filePath).pipe(res);
      return;
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }

    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
    });
    createReadStream(filePath, { start, end }).pipe(res);
  }

  @Get('download/:lessonId')
  async download(@Param('lessonId') lessonId: string, @Query('token') token: string, @Res() res: Response) {
    const payload = this.signedUrl.verify(token, 'download');
    if (payload.lessonId !== lessonId) {
      throw new UnauthorizedException('Storage token does not match lesson');
    }

    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || lesson.type !== 'RESOURCE' || !lesson.storageKey) {
      throw new NotFoundException('Resource not found');
    }

    const filePath = this.localFile.resolvePath('resources', lesson.storageKey);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Resource file not found on disk');
    }

    const stat = statSync(filePath);
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': lesson.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${lesson.fileName ?? lesson.storageKey}"`,
    });
    createReadStream(filePath).pipe(res);
  }
}
