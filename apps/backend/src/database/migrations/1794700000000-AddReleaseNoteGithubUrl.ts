import { MigrationInterface, QueryRunner } from 'typeorm';

/** Release notes: a link to the release on GitHub. */
export class AddReleaseNoteGithubUrl1794700000000 implements MigrationInterface {
  name = 'AddReleaseNoteGithubUrl1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "release_notes" ADD "github_url" character varying(300)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "release_notes" DROP COLUMN "github_url"`,
    );
  }
}
