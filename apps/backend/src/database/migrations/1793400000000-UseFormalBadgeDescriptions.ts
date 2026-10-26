import { MigrationInterface, QueryRunner } from 'typeorm';

// Fragments of badge descriptions moved from "tu" to "vous": [id, informal, formal].
const REWORDINGS: [string, string, string][] = [
  ['earth_center', 'qui te sépare', 'qui vous sépare'],
  ['paris_ring_road', 'plus vite que toi', 'plus vite que vous'],
  ['time_kipchoge', 'compte tes heures', 'compte vos heures'],
  ['time_week', "ni t'arrêter. Ton temps", 'ni vous arrêter. Votre temps'],
  ['time_work_year', 'Ton sport', 'Votre sport'],
  ['active_days', 'où tu as fait', 'où vous avez fait'],
  [
    'tiles',
    'plus tu explores de territoires, plus tu montes de paliers',
    'plus vous explorez de territoires, plus vous montez de paliers',
  ],
  ['subtiles', 'de ton terrain', 'de votre terrain'],
  [
    'stations',
    'lors de tes activités. Chaque palier te rapproche',
    'lors de vos activités. Chaque palier vous rapproche',
  ],
];

export class UseFormalBadgeDescriptions1793400000000 implements MigrationInterface {
  name = 'UseFormalBadgeDescriptions1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [id, informal, formal] of REWORDINGS) {
      await queryRunner.query(
        `UPDATE "badges" SET "description" = replace("description", $1, $2) WHERE "id" = $3`,
        [informal, formal, id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [id, informal, formal] of REWORDINGS) {
      await queryRunner.query(
        `UPDATE "badges" SET "description" = replace("description", $1, $2) WHERE "id" = $3`,
        [formal, informal, id],
      );
    }
  }
}
