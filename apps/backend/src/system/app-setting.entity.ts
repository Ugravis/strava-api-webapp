import type { AppSettingKey, MaintenanceBanner } from '@kilotrace/shared';
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Key of the maintenance banner, kept beside the settings of the catalog. */
export const MAINTENANCE_KEY = 'maintenance';

/**
 * A setting of the site changed from the back office: one row per changed
 * setting of the catalog, the default standing in for the others, and the
 * maintenance banner while shown.
 */
@Entity('app_settings')
export class AppSetting {
  @PrimaryColumn({
    type: 'varchar',
    length: 40,
    primaryKeyConstraintName: 'PK_app_settings',
  })
  key!: AppSettingKey | typeof MAINTENANCE_KEY;

  /** A boolean, a number or null, as the catalog types it; the banner under its key. */
  @Column({ type: 'jsonb', nullable: true })
  value!: boolean | number | MaintenanceBanner | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
