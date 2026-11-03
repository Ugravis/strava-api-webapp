import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The releases of the site and their notes, with the views of the users.
 * The releases already tagged are recorded, without a note; those to come
 * are recorded by the backend as it starts on them.
 */
export class AddReleaseNotes1794500000000 implements MigrationInterface {
  name = 'AddReleaseNotes1794500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "release_notes" ("version" character varying(16) NOT NULL, "released_at" TIMESTAMP WITH TIME ZONE, "status" character varying(16) NOT NULL DEFAULT 'draft', "display" character varying(16) NOT NULL, "title" character varying(80), "summary" character varying(240), "section_new" text, "section_improved" text, "section_fixed" text, "section_other" text, "notified_at" TIMESTAMP WITH TIME ZONE, "updated_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_release_notes" PRIMARY KEY ("version"), CONSTRAINT "CHK_release_notes_status" CHECK ("status" IN ('draft', 'ready')), CONSTRAINT "CHK_release_notes_display" CHECK ("display" IN ('popup', 'banner', 'notification', 'none')))`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" ADD CONSTRAINT "FK_release_notes_updated_by" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "release_note_views" ("user_id" uuid NOT NULL, "version" character varying(16) NOT NULL, "seen_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_release_note_views" PRIMARY KEY ("user_id", "version"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_release_note_views_version" ON "release_note_views" ("version")`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_note_views" ADD CONSTRAINT "FK_release_note_views_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_note_views" ADD CONSTRAINT "FK_release_note_views_note" FOREIGN KEY ("version") REFERENCES "release_notes"("version") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // The releases tagged so far, at the time of their tag.
    await queryRunner.query(
      `INSERT INTO "release_notes" ("version", "released_at", "display", "created_at", "updated_at") VALUES
       ('0.1.0', '2026-10-22T22:27:54+02:00', 'banner', '2026-10-22T22:27:54+02:00', '2026-10-22T22:27:54+02:00'),
       ('0.1.1', '2026-10-23T15:11:05+02:00', 'notification', '2026-10-23T15:11:05+02:00', '2026-10-23T15:11:05+02:00'),
       ('0.2.0', '2026-10-25T11:39:00+01:00', 'banner', '2026-10-25T11:39:00+01:00', '2026-10-25T11:39:00+01:00')
       ON CONFLICT DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "admin_role_permissions" ("role", "permission") VALUES ('admin', 'releaseNotes.create'), ('admin', 'releaseNotes.edit'), ('admin', 'releaseNotes.publish'), ('admin', 'releaseNotes.delete') ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "admin_role_permissions" WHERE "permission" LIKE 'releaseNotes.%'`,
    );
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "type" = 'release_note'`,
    );
    await queryRunner.query(`DROP TABLE "release_note_views"`);
    await queryRunner.query(`DROP TABLE "release_notes"`);
  }
}
