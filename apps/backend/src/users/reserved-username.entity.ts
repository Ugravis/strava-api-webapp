import type { ReservedUsernameCategory } from '@kilotrace/shared/admin';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Usernames kept out of the sign-ups and profile edits, set from the back
 * office. The author carries no foreign key, so that the list survives the
 * account (and the development reset of the users).
 */
@Entity('reserved_usernames')
export class ReservedUsername {
  @PrimaryColumn({
    type: 'varchar',
    length: 20,
    primaryKeyConstraintName: 'PK_reserved_usernames',
  })
  username!: string;

  @Column({ type: 'varchar', length: 16 })
  category!: ReservedUsernameCategory;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  /** Null for the initial list. */
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
