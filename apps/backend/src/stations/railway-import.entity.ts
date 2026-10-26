import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** One import of the stations and the links, with its report for the admin page. */
@Entity('railway_imports')
export class RailwayImport {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Name of the OSM file imported. */
  @Column({ type: 'text' })
  source!: string;

  /** See `RailwayImportReport`. */
  @Column({ type: 'jsonb' })
  report!: unknown;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt!: Date;
}
