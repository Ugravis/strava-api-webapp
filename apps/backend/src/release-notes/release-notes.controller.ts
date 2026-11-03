import type {
  ReleaseNotesResponse,
  UnseenReleaseNotesResponse,
} from '@kilotrace/shared';
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { MarkReleaseNotesSeenDto } from './release-notes.dto';
import { ReleaseNotesService } from './release-notes.service';

/** The notes of the releases, for the signed-in users. */
@Controller('release-notes')
export class ReleaseNotesController {
  constructor(private readonly releaseNotes: ReleaseNotesService) {}

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
