import { Controller, Get, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { AVATAR_FILE_NAME_PATTERN, AvatarsService } from './avatars.service';

/** Serves avatars. File names are random and never reused, so they are cached forever. */
@Public()
@SkipThrottle()
@Controller('avatars')
export class AvatarsController {
  constructor(private readonly avatars: AvatarsService) {}

  @Get(':userId/:fileName')
  async get(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ): Promise<void> {
    const object = AVATAR_FILE_NAME_PATTERN.test(fileName)
      ? await this.avatars.get(userId, fileName)
      : null;
    if (!object) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'Avatar not found');
    }
    response.setHeader('Content-Type', object.contentType ?? 'image/webp');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (object.contentLength !== undefined) {
      response.setHeader('Content-Length', object.contentLength);
    }
    object.body.pipe(response);
  }
}
