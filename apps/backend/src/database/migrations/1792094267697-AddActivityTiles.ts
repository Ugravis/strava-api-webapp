import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityTiles1792094267697 implements MigrationInterface {
  name = 'AddActivityTiles1792094267697';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "activity_tile_states" ("activity_id" uuid NOT NULL, "status" character varying(20) NOT NULL, "precision" character varying(10), "stream_reason" character varying(10), "hidden_start_m" real NOT NULL DEFAULT '0', "hidden_end_m" real NOT NULL DEFAULT '0', "attempts" integer NOT NULL DEFAULT '0', "run_after" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9c59147c4be9d015c2759fd423f" PRIMARY KEY ("activity_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_049e0a8e9a75ec52ffac95a4f1" ON "activity_tile_states"  ("status", "run_after") `,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_tiles" ("activity_id" uuid NOT NULL, "x" integer NOT NULL, "y" integer NOT NULL, "user_id" uuid NOT NULL, "mask" bigint NOT NULL DEFAULT '0', "shared_mask" bigint NOT NULL DEFAULT '0', "hidden_mask" bigint NOT NULL DEFAULT '0', CONSTRAINT "PK_7d8db5952f6372c9fa71e825934" PRIMARY KEY ("activity_id", "x", "y"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_29bd0b4591dfd7e79b366bea50" ON "activity_tiles"  ("user_id", "x", "y") `,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_tile_states" ADD CONSTRAINT "FK_9c59147c4be9d015c2759fd423f" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_tiles" ADD CONSTRAINT "FK_2089146f220519b5aac201be3a4" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_tiles" ADD CONSTRAINT "FK_486ceb89a3b6f067188840fcdee" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_tiles" DROP CONSTRAINT "FK_486ceb89a3b6f067188840fcdee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_tiles" DROP CONSTRAINT "FK_2089146f220519b5aac201be3a4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_tile_states" DROP CONSTRAINT "FK_9c59147c4be9d015c2759fd423f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29bd0b4591dfd7e79b366bea50"`,
    );
    await queryRunner.query(`DROP TABLE "activity_tiles"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_049e0a8e9a75ec52ffac95a4f1"`,
    );
    await queryRunner.query(`DROP TABLE "activity_tile_states"`);
  }
}
