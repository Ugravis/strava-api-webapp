import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTileFirstVisits1792310120776 implements MigrationInterface {
  name = 'AddTileFirstVisits1792310120776';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tile_first_visits" ("activity_id" uuid NOT NULL, "x" integer NOT NULL, "y" integer NOT NULL, "user_id" uuid NOT NULL, "visited_at" TIMESTAMP WITH TIME ZONE NOT NULL, "mask" bigint NOT NULL, CONSTRAINT "PK_24a2a2488f99e5ae4b0d389e378" PRIMARY KEY ("activity_id", "x", "y"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c6df923bde435e4628991892cc" ON "tile_first_visits"  ("user_id", "x", "y") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tile_first_visits" ADD CONSTRAINT "FK_c7cdde8c430e75455fc7e921013" FOREIGN KEY ("activity_id") REFERENCES "activity_gains"("activity_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // From the gains already replayed: the small tiles (zoom 17) grouped by
    // large tile (zoom 14), 8 × 8 small tiles each.
    await queryRunner.query(
      `INSERT INTO tile_first_visits (activity_id, user_id, x, y, visited_at, mask)
       SELECT g.activity_id, g.user_id, s.x >> 3, s.y >> 3, a.started_at,
         bit_or(1::bigint << ((s.y & 7) * 8 + (s.x & 7)))
       FROM activity_gains g
       JOIN activities a ON a.id = g.activity_id
       CROSS JOIN LATERAL (
         SELECT g.gained_subtiles[2 * i - 1] AS x, g.gained_subtiles[2 * i] AS y
         FROM generate_series(1, cardinality(g.gained_subtiles) / 2) AS i
       ) s
       GROUP BY g.activity_id, g.user_id, s.x >> 3, s.y >> 3, a.started_at`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tile_first_visits" DROP CONSTRAINT "FK_c7cdde8c430e75455fc7e921013"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c6df923bde435e4628991892cc"`,
    );
    await queryRunner.query(`DROP TABLE "tile_first_visits"`);
  }
}
