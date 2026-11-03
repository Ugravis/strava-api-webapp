import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** A user who saw the note of a version: in its popup, its banner, its notification or the history. */
@Entity('release_note_views')
export class ReleaseNoteView {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 16 })
  version!: string;

  @CreateDateColumn({ name: 'seen_at', type: 'timestamptz' })
  seenAt!: Date;
}
