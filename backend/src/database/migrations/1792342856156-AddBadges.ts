import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBadges1792342856156 implements MigrationInterface {
  name = 'AddBadges1792342856156';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "badges" ("id" character varying(64) NOT NULL, "family" character varying(16) NOT NULL, "distance_m" double precision NOT NULL, "name" character varying(80) NOT NULL, "description" character varying(300) NOT NULL, "icon" character varying(40) NOT NULL, "position" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8a651318b8de577e8e217676466" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_badge_pins" ("user_id" uuid NOT NULL, "badge_id" character varying(64) NOT NULL, "pinned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8078d5e63c437532fa2685850bc" PRIMARY KEY ("user_id", "badge_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge_pins" ADD CONSTRAINT "FK_e43510af247edc4b2898f13c410" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge_pins" ADD CONSTRAINT "FK_ccb16ccdd712ea99f3287f575fb" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // The catalog of distance badges, later badges added by their own migrations.
    await queryRunner.query(`INSERT INTO "badges" ("id", "family", "distance_m", "name", "description", "icon", "position") VALUES
        ('earth_center', 'all', 6371000, 'Centre de la Terre', 'La distance qui te sépare du centre de la Terre : 6 371 km à travers la croûte, le manteau puis le noyau de fer et de nickel. Personne n''y est jamais allé : le forage le plus profond, sur la presqu''île de Kola, s''est arrêté à 12 km.', 'pickaxe', 1),
        ('earth_circumference', 'all', 40075000, 'Tour du globe', 'Le tour de la Terre par l''équateur : 40 075 km. L''expédition de Magellan, achevée par Elcano, a mis trois ans à boucler le premier tour du monde, entre 1519 et 1522.', 'earth', 2),
        ('earth_moon', 'all', 384400000, 'Terre-Lune', 'La distance moyenne entre la Terre et la Lune : 384 400 km, parcourus en trois jours par l''équipage d''Apollo 11 en juillet 1969. La Lune s''éloigne de nous d''environ 3,8 cm par an.', 'moon', 3),
        ('paris_ring_road', 'run', 35000, 'Périphérique parisien', 'Le boulevard périphérique fait le tour de Paris sur 35 km. Achevé en 1973, il voit passer chaque jour plus d''un million de véhicules, bien plus vite que toi, mais rarement plus librement.', 'car', 4),
        ('marathon', 'run', 42195, 'Marathon', '42,195 km : la distance courue aux Jeux olympiques de Londres en 1908, du château de Windsor au stade, devenue officielle en 1921. Elle rend hommage au messager grec qui aurait couru de Marathon à Athènes.', 'medal', 5),
        ('lake_geneva', 'run', 175000, 'Tour du Léman', 'Le Léman, partagé entre la France et la Suisse, est l''un des plus grands lacs d''Europe de l''Ouest. Son tour fait environ 175 km, de Genève à Lausanne et Montreux, puis par Évian et Thonon.', 'waves', 6),
        ('gr20', 'hike', 180000, 'GR20', 'Le GR20 traverse la Corse du nord au sud, de Calenzana à Conca, sur environ 180 km et plus de 12 000 m de dénivelé positif. Il est réputé être l''un des sentiers de grande randonnée les plus exigeants d''Europe.', 'mountain', 7),
        ('camino_vezelay', 'hike', 900000, 'Compostelle depuis Vézelay', 'La voie de Vézelay, l''un des quatre grands chemins de Compostelle en France, mène de la basilique de Vézelay à Saint-Jean-Pied-de-Port, au pied des Pyrénées : environ 900 km à travers le Berry, le Limousin et le Périgord.', 'shell', 8),
        ('hexatrek', 'hike', 3000000, 'HexaTrek', 'Créé en 2022, l''HexaTrek traverse la France de l''Alsace au Pays basque sur environ 3 000 km, par les Vosges, le Jura, les Alpes, les Cévennes et les Pyrénées, en reliant de nombreux parcs naturels.', 'hexagon', 9),
        ('pacific_crest_trail', 'hike', 4270000, 'Pacific Crest Trail', 'Le Pacific Crest Trail longe l''ouest des États-Unis, de la frontière mexicaine au Canada, à travers la Californie, l''Oregon et l''État de Washington : 4 270 km que les randonneurs parcourent en général en cinq mois.', 'tree-pine', 10),
        ('tour_de_france', 'ride', 3500000, 'Tour de France', 'Depuis 1903, le Tour de France couvre chaque été environ 3 500 km en 21 étapes. Les coureurs le bouclent en trois semaines, à plus de 40 km/h de moyenne.', 'bike', 11),
        ('trans_siberian', 'ride', 9289000, 'Transsibérien', 'Le Transsibérien relie Moscou à Vladivostok sur 9 289 km : la plus longue ligne de chemin de fer du monde, qui traverse sept fuseaux horaires en une semaine de train.', 'train-front', 12),
        ('pan_american_highway', 'ride', 24000000, 'Route panaméricaine', 'La route panaméricaine traverse le continent américain, de l''Alaska à la pointe sud de l''Argentine. Elle n''est interrompue qu''une fois, par le bouchon du Darién, une jungle entre le Panama et la Colombie.', 'route', 13)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_badge_pins" DROP CONSTRAINT "FK_ccb16ccdd712ea99f3287f575fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge_pins" DROP CONSTRAINT "FK_e43510af247edc4b2898f13c410"`,
    );
    await queryRunner.query(`DROP TABLE "user_badge_pins"`);
    await queryRunner.query(`DROP TABLE "badges"`);
  }
}
