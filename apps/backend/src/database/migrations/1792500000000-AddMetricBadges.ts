import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetricBadges1792500000000 implements MigrationInterface {
  name = 'AddMetricBadges1792500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "badges" RENAME COLUMN "distance_m" TO "target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" ADD "metric" character varying(16) NOT NULL DEFAULT 'distance'`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" ADD "tiers" double precision array`,
    );
    await queryRunner.query(`INSERT INTO "badge_themes" ("id", "name", "position") VALUES
        ('mountains', 'Sommets', 4),
        ('endurance', 'Endurance', 5)`);
    // Time badges are in seconds, elevation badges in meters.
    await queryRunner.query(`INSERT INTO "badges" ("id", "metric", "family", "target", "name", "description", "theme_id", "icon", "position") VALUES
        ('time_kipchoge', 'time', 'run', 7180, 'Marathon sous les 2 h', 'En 2019, à Vienne, Eliud Kipchoge a couru le premier marathon en moins de deux heures : 1 h 59 min 40 s, avec des lièvres et dans des conditions hors compétition. Ce badge compte tes heures de course à pied.', 'endurance', 'timer', 38),
        ('time_ironman', 'time', 'all', 61200, 'Limite d''un Ironman', 'Un Ironman, c''est 3,8 km de natation, 180 km de vélo et un marathon, à boucler en 17 heures maximum. Ce badge compte 17 h de sport en tout.', 'endurance', 'hourglass', 39),
        ('time_le_mans', 'time', 'all', 86400, '24 Heures du Mans', 'Depuis 1923, les pilotes des 24 Heures du Mans se relaient sur le circuit de la Sarthe pendant un tour de cadran complet. Ce badge compte 24 h de sport.', 'endurance', 'car', 40),
        ('time_utmb', 'time', 'all', 167400, 'Temps limite de l''UTMB', 'L''Ultra-Trail du Mont-Blanc fait le tour du massif sur environ 170 km et 10 000 m de dénivelé positif. Les coureurs ont 46 h 30 pour le boucler, nuits comprises.', 'endurance', 'mountain-snow', 41),
        ('time_week', 'time', 'all', 604800, 'Une semaine entière', 'Sept jours, 168 heures : une semaine de sport sans dormir ni t''arrêter. Ton temps de mouvement cumulé, toutes activités confondues, finira par la remplir.', NULL, 'calendar-days', 42),
        ('time_apollo_11', 'time', 'all', 703115, 'Mission Apollo 11', 'La mission Apollo 11 a duré 195 h 18 min : du décollage de Cap Canaveral le 16 juillet 1969 à l''amerrissage dans le Pacifique huit jours plus tard, avec deux hommes sur la Lune.', 'astronomy', 'rocket', 43),
        ('time_work_year', 'time', 'all', 5785200, 'Une année de travail', 'En France, la durée légale du travail représente 1 607 heures par an. Ton sport cumulé finira peut-être par égaler une année de bureau.', NULL, 'briefcase', 44),
        ('time_kelly', 'time', 'all', 29376000, 'Un an dans l''ISS', 'L''astronaute américain Scott Kelly a passé 340 jours consécutifs à bord de la Station spatiale internationale, en 2015 et 2016, soit plus de 5 400 tours de la Terre.', 'astronomy', 'satellite', 45),
        ('time_polyakov', 'time', 'all', 37756800, 'Record de Polyakov', 'Le cosmonaute russe Valeri Poliakov détient depuis 1995 le record de la plus longue mission spatiale : 437 jours sur la station Mir.', 'astronomy', 'orbit', 46),
        ('elev_eiffel', 'elevation', 'all', 330, 'Tour Eiffel', 'La tour Eiffel culmine à 330 m, antenne comprise. Inaugurée en 1889, elle fut le monument le plus haut du monde jusqu''en 1930.', NULL, 'radio-tower', 47),
        ('elev_burj_khalifa', 'elevation', 'all', 828, 'Burj Khalifa', 'Le Burj Khalifa, à Dubaï, mesure 828 m et compte plus de 160 étages : c''est la plus haute structure jamais construite par l''humanité.', NULL, 'building', 48),
        ('elev_ventoux', 'elevation', 'all', 1910, 'Mont Ventoux', 'Le « Géant de Provence » culmine à 1 910 m. Son sommet pelé, battu par le mistral, est l''une des ascensions les plus redoutées du Tour de France.', 'mountains', 'mountain', 49),
        ('elev_mont_blanc', 'elevation', 'all', 4806, 'Mont Blanc', 'Le Mont Blanc est le plus haut sommet des Alpes et d''Europe occidentale : 4 806 m. Il fut gravi pour la première fois en 1786 par Jacques Balmat et Michel Paccard.', 'mountains', 'mountain-snow', 50),
        ('elev_kilimanjaro', 'elevation', 'all', 5895, 'Kilimandjaro', 'Le Kilimandjaro, en Tanzanie, culmine à 5 895 m : le plus haut sommet d''Afrique et le plus haut volcan isolé du monde, dont les glaciers reculent vite.', 'mountains', 'sunrise', 51),
        ('elev_everest', 'elevation', 'all', 8849, 'Everest', 'L''Everest est le sommet le plus élevé de la Terre : 8 849 m. Edmund Hillary et Tenzing Norgay l''ont atteint pour la première fois le 29 mai 1953.', 'mountains', 'mountain', 52),
        ('elev_mauna_kea', 'elevation', 'all', 10210, 'Mauna Kea', 'Mesuré depuis le plancher océanique, le Mauna Kea, à Hawaï, s''élève à plus de 10 000 m : plus que l''Everest, dont seule une partie émerge à 4 207 m.', 'mountains', 'flame', 53),
        ('elev_olympus_mons', 'elevation', 'all', 21900, 'Olympus Mons', 'Olympus Mons, sur Mars, est le plus haut volcan du système solaire : environ 22 km, soit presque trois fois l''Everest.', 'astronomy', 'rocket', 54),
        ('elev_karman', 'elevation', 'all', 100000, 'Ligne de Kármán', 'À 100 km d''altitude, la ligne de Kármán marque la frontière conventionnelle entre l''atmosphère terrestre et l''espace.', 'astronomy', 'sparkles', 55)`);
    // Challenges are completed only once, tier by tier.
    await queryRunner.query(`INSERT INTO "badges" ("id", "metric", "family", "target", "tiers", "name", "description", "theme_id", "icon", "position") VALUES
        ('activities', 'activities', 'all', 2000, ARRAY[10, 25, 50, 100, 250, 500, 1000, 2000], 'Activités', 'Le nombre d''activités enregistrées, toutes confondues. Chaque palier récompense un cap de régularité, de la première dizaine aux 2 000 sorties.', NULL, 'footprints', 56),
        ('active_days', 'active_days', 'all', 1000, ARRAY[7, 30, 100, 200, 365, 500, 1000], 'Jours actifs', 'Le nombre de jours différents où tu as fait au moins une activité, consécutifs ou non. Deux sorties le même jour ne comptent qu''une fois.', NULL, 'calendar-check', 57),
        ('tiles', 'tiles', 'all', 5000, ARRAY[10, 50, 100, 250, 500, 1000, 2500, 5000], 'Grandes tuiles', 'Le nombre de grandes tuiles de la carte (environ 2 km de côté) parcourues au moins une fois : plus tu explores de territoires, plus tu montes de paliers.', NULL, 'grid-3x3', 58),
        ('subtiles', 'subtiles', 'all', 100000, ARRAY[100, 500, 1000, 5000, 10000, 25000, 50000, 100000], 'Petites tuiles', 'Le nombre de petites tuiles de la carte (environ 250 m de côté) parcourues au moins une fois : le détail de ton terrain de jeu.', NULL, 'layout-grid', 59),
        ('stations', 'stations', 'all', 1000, ARRAY[5, 10, 20, 50, 100, 200, 500, 1000], 'Gares', 'Le nombre de gares ferroviaires visitées lors de tes activités. Chaque palier te rapproche du titre de chef de gare.', NULL, 'train-front', 60)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "badges" WHERE "metric" <> 'distance'`,
    );
    await queryRunner.query(
      `DELETE FROM "badge_themes" WHERE "id" IN ('mountains', 'endurance')`,
    );
    await queryRunner.query(`ALTER TABLE "badges" DROP COLUMN "tiers"`);
    await queryRunner.query(`ALTER TABLE "badges" DROP COLUMN "metric"`);
    await queryRunner.query(
      `ALTER TABLE "badges" RENAME COLUMN "target" TO "distance_m"`,
    );
  }
}
