import type { AdminRole } from '@kilotrace/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Back-office account, separate from the application users. Its email is the
 * sign-in allowlist entry; disabling it revokes every right immediately.
 */
@Entity('admin_users')
@Unique('UQ_admin_users_email', ['email'])
@Check('CHK_admin_users_role', `"role" IN ('support', 'admin', 'super-admin')`)
export class AdminUser {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_admin_users',
  })
  id!: string;

  /** Always stored lowercased. */
  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: AdminRole;

  @Column({ name: 'disabled_at', type: 'timestamptz', nullable: true })
  disabledAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
