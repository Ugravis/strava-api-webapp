import { MigrationInterface, QueryRunner } from 'typeorm';

/** The distinctions move from the code to a catalog managed from the back office. */
export class AddDistinctions1794300000000 implements MigrationInterface {
  name = 'AddDistinctions1794300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "distinctions" ("id" character varying(32) NOT NULL, "name" character varying(40) NOT NULL, "description" character varying(300), "icon" character varying(40) NOT NULL, "color" character varying(7), "position" integer NOT NULL, "system" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_distinctions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "distinctions" ("id", "name", "description", "icon", "color", "position", "system") VALUES
       ('founder', 'Fondateur', 'A créé l''application et l''a ouverte à la communauté.', 'crown', '#f59e0b', 1, false),
       ('team', 'Équipe', 'Fait partie de l''équipe qui construit et fait vivre l''application.', 'shield-check', '#3b82f6', 2, true),
       ('early_member', '100 premiers membres', 'Parmi les 100 premiers membres à avoir rejoint l''aventure.', 'rocket', NULL, 3, true)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_distinctions" ADD CONSTRAINT "FK_user_distinctions_distinction" FOREIGN KEY ("kind") REFERENCES "distinctions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "admin_role_permissions" ("role", "permission") VALUES ('admin', 'distinctions.create'), ('admin', 'distinctions.edit'), ('admin', 'distinctions.delete') ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "admin_role_permissions" WHERE "permission" LIKE 'distinctions.%'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_distinctions" DROP CONSTRAINT "FK_user_distinctions_distinction"`,
    );
    await queryRunner.query(`DROP TABLE "distinctions"`);
  }
}
