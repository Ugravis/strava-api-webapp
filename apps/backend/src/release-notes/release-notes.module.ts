import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReleaseNote } from './release-note.entity';
import { ReleaseNoteView } from './release-note-view.entity';
import { ReleaseNotesController } from './release-notes.controller';
import { ReleaseNotesService } from './release-notes.service';

/** The releases of the site and their notes, recorded as the backend starts on a new version. */
@Module({
  imports: [
    TypeOrmModule.forFeature([ReleaseNote, ReleaseNoteView]),
    NotificationsModule,
  ],
  controllers: [ReleaseNotesController],
  providers: [ReleaseNotesService],
  exports: [ReleaseNotesService],
})
export class ReleaseNotesModule {}
