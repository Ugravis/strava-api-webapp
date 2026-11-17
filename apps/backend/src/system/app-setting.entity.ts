import type { AppSettingKey } from '@kilotrace/shared';
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * A setting of the site changed from the back office: one row per changed
 * setting, the catalog default standing in for the others.
 */
@Entity('app_settings')
export class AppSetting {
  @PrimaryColumn({
    type: 'varchar',
    length: 40,
    primaryKeyConstraintName: 'PK_app_settings',
  })
  key!: AppSettingKey;

  /** A boolean, a number or null, as the catalog types it. */
  @Column({ type: 'jsonb', nullable: true })
  value!: boolean | number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
