import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSwimBadges1792800000000 implements MigrationInterface {
  name = 'AddSwimBadges1792800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO "badges" ("id", "metric", "family", "target", "name", "description", "theme_id", "icon", "position") VALUES
        ('swim_bosphorus', 'distance', 'swim', 6500, 'Traversée du Bosphore', 'Chaque été, des nageurs relient l''Asie à l''Europe en traversant le Bosphore à Istanbul, sur environ 6,5 km portés par le courant du détroit.', NULL, 'waves', 61),
        ('swim_gibraltar', 'distance', 'swim', 14400, 'Détroit de Gibraltar', 'Au plus étroit, 14,4 km séparent l''Espagne du Maroc. La traversée à la nage, entre deux continents et deux mers, se fait au milieu des cargos et parfois des dauphins.', NULL, 'lighthouse', 62),
        ('swim_english_channel', 'distance', 'swim', 33800, 'Traversée de la Manche', 'Environ 33,8 km séparent Douvres du cap Gris-Nez. Le capitaine Matthew Webb fut le premier à traverser la Manche à la nage, en 1875, en près de 22 heures.', NULL, 'droplet', 63),
        ('swim_lake_geneva', 'distance', 'swim', 70000, 'Le Léman en longueur', 'Le Léman s''étire sur environ 70 km de Genève à Villeneuve. Le nager d''un bout à l''autre, dans une eau souvent fraîche, est l''un des grands défis de la nage en eau libre.', NULL, 'sun', 64)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "badges" WHERE "family" = 'swim'`);
  }
}
