import type {
  ReleaseNotesResponse,
  UnseenReleaseNotesResponse,
} from '@kilotrace/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import {
  BANNER_FILE_NAME_PATTERN,
  ReleaseNoteBannersService,
} from './release-note-banners.service';
import { MarkReleaseNotesSeenDto } from './release-notes.dto';
import { ReleaseNotesService } from './release-notes.service';

/** The notes of the releases, for the signed-in users. */
@Controller('release-notes')
export class ReleaseNotesController {
  constructor(
    private readonly releaseNotes: ReleaseNotesService,
    private readonly banners: ReleaseNoteBannersService,
  ) {}

  /** A banner image: its name is random and never reused, so it is cached forever. */
  @Public()
  @SkipThrottle()
  @Get('banners/:fileName')
  async banner(
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ): Promise<void> {
    const object = BANNER_FILE_NAME_PATTERN.test(fileName)
      ? await this.banners.get(fileName)
      : null;
    if (!object) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'Banner not found');
    }
    response.setHeader('Content-Type', object.contentType ?? 'image/webp');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (object.contentLength !== undefined) {
      response.setHeader('Content-Length', object.contentLength);
    }
    object.body.pipe(response);
  }

  /** The history: every note published, the latest first. */
  @Get()
  async list(): Promise<ReleaseNotesResponse> {
    return { notes: await this.releaseNotes.published() };
  }

  /** The notes to show on arrival, and how. */
  @Get('unseen')
  unseen(@CurrentUser() user: User): Promise<UnseenReleaseNotesResponse> {
    return this.releaseNotes.unseen(user);
  }

  @Post('seen')
  @HttpCode(204)
  seen(
    @CurrentUser() user: User,
    @Body() { versions }: MarkReleaseNotesSeenDto,
  ): Promise<void> {
    return this.releaseNotes.markSeen(user, versions);
  }
}
