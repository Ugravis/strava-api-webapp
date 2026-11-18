import { MigrationInterface, QueryRunner } from 'typeorm';

/** Release notes: a part read by the back-office team only. */
export class AddReleaseNoteTeamSection1796800000000 implements MigrationInterface {
  name = 'AddReleaseNoteTeamSection1796800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "release_notes" ADD "section_team" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "release_notes" DROP COLUMN "section_team"`,
    );
  }
}
