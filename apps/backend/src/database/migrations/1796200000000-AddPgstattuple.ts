import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `pgstattuple`, shipped with Postgres: the database page measures the
 * space a table keeps after its rows are deleted (`pgstattuple_approx`).
 */
export class AddPgstattuple1796200000000 implements MigrationInterface {
  name = 'AddPgstattuple1796200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgstattuple`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS pgstattuple`);
  }
}
