import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { ReleaseNote } from './release-note.entity';
import { ReleaseNoteBannersService } from './release-note-banners.service';
import { ReleaseNoteView } from './release-note-view.entity';
import { ReleaseNotesController } from './release-notes.controller';
import { ReleaseNotesService } from './release-notes.service';

/** The releases of the site and their notes, recorded as the backend starts on a new version. */
@Module({
  imports: [
    TypeOrmModule.forFeature([ReleaseNote, ReleaseNoteView]),
    NotificationsModule,
    StorageModule,
  ],
  controllers: [ReleaseNotesController],
  providers: [ReleaseNotesService, ReleaseNoteBannersService],
  exports: [ReleaseNotesService, ReleaseNoteBannersService],
})
export class ReleaseNotesModule {}
