import type { MaintenanceTitle } from '@kilotrace/shared';
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Switches of the whole site, set from the back office: a single row. */
@Entity('system_settings')
export class SystemSettings {
  @PrimaryColumn({
    type: 'smallint',
    primaryKeyConstraintName: 'PK_system_settings',
  })
  id!: number;

  @Column({ name: 'signups_enabled', type: 'boolean', default: true })
  signupsEnabled!: boolean;

  /** Null while no banner is shown. */
  @Column({
    name: 'maintenance_title',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  maintenanceTitle!: MaintenanceTitle | null;

  @Column({ name: 'maintenance_description', type: 'text', nullable: true })
  maintenanceDescription!: string | null;

  @Column({ name: 'maintenance_since', type: 'timestamptz', nullable: true })
  maintenanceSince!: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
