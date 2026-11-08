import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBadgeBackgrounds1792600000000 implements MigrationInterface {
  name = 'AddBadgeBackgrounds1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "badges" ADD "background_color" character varying(7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" ADD "background_image" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" ADD CONSTRAINT "CHK_badges_background" CHECK ("background_color" IS NULL OR "background_image" IS NULL)`,
    );
    // Colors of the leader's jerseys: yellow, pink and red.
    await queryRunner.query(
      `UPDATE "badges" SET "name" = 'Tour de France', "background_color" = '#FFE100' WHERE "id" = 'tour_de_france'`,
    );
    await queryRunner.query(
      `UPDATE "badges" SET "name" = 'Giro d''Italia', "background_color" = '#F5A3C7' WHERE "id" = 'giro'`,
    );
    await queryRunner.query(
      `UPDATE "badges" SET "name" = 'Vuelta a España', "background_color" = '#E30613' WHERE "id" = 'vuelta'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "badges" SET "name" = 'Tour d''Italie' WHERE "id" = 'giro'`,
    );
    await queryRunner.query(
      `UPDATE "badges" SET "name" = 'Tour d''Espagne' WHERE "id" = 'vuelta'`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" DROP CONSTRAINT "CHK_badges_background"`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" DROP COLUMN "background_image"`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" DROP COLUMN "background_color"`,
    );
  }
}
