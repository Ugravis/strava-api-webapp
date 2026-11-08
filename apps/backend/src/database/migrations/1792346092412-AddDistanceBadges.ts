import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDistanceBadges1792346092412 implements MigrationInterface {
  name = 'AddDistanceBadges1792346092412';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "badge_themes" ("id" character varying(32) NOT NULL, "name" character varying(40) NOT NULL, "position" integer NOT NULL, CONSTRAINT "PK_c6a34affb2a21b223e62dbf978e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "badges" ("id" character varying(64) NOT NULL, "family" character varying(16) NOT NULL, "distance_m" double precision NOT NULL, "name" character varying(80) NOT NULL, "description" character varying(300) NOT NULL, "theme_id" character varying(32), "icon" character varying(40) NOT NULL, "position" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8a651318b8de577e8e217676466" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_favorite_badges" ("user_id" uuid NOT NULL, "badge_id" character varying(64) NOT NULL, "position" integer NOT NULL, "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c9484d4f8e721ecf05331d1bb14" PRIMARY KEY ("user_id", "badge_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" ADD CONSTRAINT "FK_b79d812b201834dd6792c9b3ec5" FOREIGN KEY ("theme_id") REFERENCES "badge_themes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_favorite_badges" ADD CONSTRAINT "FK_5182d15bfb2f898836b698f56bf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_favorite_badges" ADD CONSTRAINT "FK_932cb72a53d2288b8f7d962319b" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // The catalog of distance badges, ordered by family then by distance;
    // later badges are added by their own migrations.
    await queryRunner.query(`INSERT INTO "badge_themes" ("id", "name", "position") VALUES
        ('astronomy', 'Astronomie', 1),
        ('gr', 'GR', 2),
        ('grand_tours', 'Grands Tours', 3)`);
    await queryRunner.query(`INSERT INTO "badges" ("id", "family", "distance_m", "name", "description", "theme_id", "icon", "position") VALUES
        ('earth_center', 'all', 6371000, 'Centre de la Terre', 'La distance qui te sépare du centre de la Terre : 6 371 km à travers la croûte, le manteau puis le noyau de fer et de nickel. Personne n''y est jamais allé : le forage le plus profond, sur la presqu''île de Kola, s''est arrêté à 12 km.', NULL, 'pickaxe', 1),
        ('triton_circumference', 'all', 8504000, 'Tour de Triton', 'Le tour de Triton, la plus grande lune de Neptune : 8 504 km. Elle tourne à contresens de sa planète, et des geysers d''azote jaillissent de sa surface glacée, vers −235 °C.', 'astronomy', 'sparkles', 2),
        ('europa_circumference', 'all', 9807000, 'Tour d''Europe', 'Le tour d''Europe, lune de Jupiter : 9 807 km. Sous sa croûte de glace se cache un océan d''eau salée qui contiendrait plus d''eau que tous les océans de la Terre réunis.', 'astronomy', 'droplet', 3),
        ('moon_circumference', 'all', 10921000, 'Tour de la Lune', 'Le tour de la Lune : 10 921 km. Elle nous montre toujours la même face, car elle tourne sur elle-même dans le temps qu''il lui faut pour faire le tour de la Terre.', 'astronomy', 'moon-star', 4),
        ('io_circumference', 'all', 11445000, 'Tour d''Io', 'Le tour d''Io, lune de Jupiter : 11 445 km. C''est le corps le plus volcanique du système solaire, avec plus de 400 volcans actifs chauffés par les marées de Jupiter.', 'astronomy', 'flame', 5),
        ('callisto_circumference', 'all', 15144000, 'Tour de Callisto', 'Le tour de Callisto, lune de Jupiter : 15 144 km. Sa surface, l''une des plus anciennes du système solaire, est criblée de cratères d''impact d''un pôle à l''autre.', 'astronomy', 'circle-dot', 6),
        ('mercury_circumference', 'all', 15334000, 'Tour de Mercure', 'Le tour de Mercure, la plus petite planète et la plus proche du Soleil : 15 334 km. Ses journées y sont brûlantes, à plus de 400 °C, et ses nuits glaciales, vers −180 °C.', 'astronomy', 'thermometer-sun', 7),
        ('titan_circumference', 'all', 16177000, 'Tour de Titan', 'Le tour de Titan, la plus grande lune de Saturne : 16 177 km. Seule lune dotée d''une atmosphère épaisse, elle est parsemée de lacs de méthane liquide. La sonde Huygens s''y est posée en 2005.', 'astronomy', 'cloud', 8),
        ('ganymede_circumference', 'all', 16551000, 'Tour de Ganymède', 'Le tour de Ganymède : 16 551 km. La plus grande lune du système solaire, en orbite autour de Jupiter, est plus grande que Mercure et possède son propre champ magnétique.', 'astronomy', 'crown', 9),
        ('mars_circumference', 'all', 21339000, 'Tour de Mars', 'Le tour de Mars, la planète rouge : 21 339 km. Elle abrite Olympus Mons, le plus haut volcan connu du système solaire, qui culmine à environ 22 km d''altitude.', 'astronomy', 'rocket', 10),
        ('venus_circumference', 'all', 38025000, 'Tour de Vénus', 'Le tour de Vénus : 38 025 km, presque autant que celui de la Terre. Sous ses épais nuages d''acide sulfurique, il fait plus de 460 °C : c''est la planète la plus chaude du système solaire.', 'astronomy', 'cloud-fog', 11),
        ('earth_circumference', 'all', 40075000, 'Tour du globe', 'Le tour de la Terre par l''équateur : 40 075 km. L''expédition de Magellan, achevée par Elcano, a mis trois ans à boucler le premier tour du monde, entre 1519 et 1522.', 'astronomy', 'earth', 12),
        ('neptune_circumference', 'all', 155597000, 'Tour de Neptune', 'Le tour de Neptune, la planète la plus éloignée du Soleil : 155 597 km. Ses vents, les plus rapides du système solaire, dépassent 2 000 km/h.', 'astronomy', 'wind', 13),
        ('uranus_circumference', 'all', 160592000, 'Tour d''Uranus', 'Le tour d''Uranus : 160 592 km. Cette géante de glace tourne couchée sur le côté, son axe incliné de 98° : chacun de ses pôles connaît 42 ans de jour puis 42 ans de nuit.', 'astronomy', 'snowflake', 14),
        ('saturn_circumference', 'all', 378675000, 'Tour de Saturne', 'Le tour de Saturne à l''équateur : 378 675 km. Ses anneaux de glace et de roche s''étendent sur des centaines de milliers de kilomètres, pour une épaisseur qui se compte souvent en dizaines de mètres.', 'astronomy', 'orbit', 15),
        ('earth_moon', 'all', 384400000, 'Terre-Lune', 'La distance moyenne entre la Terre et la Lune : 384 400 km, parcourus en trois jours par l''équipage d''Apollo 11 en juillet 1969. La Lune s''éloigne de nous d''environ 3,8 cm par an.', 'astronomy', 'moon', 16),
        ('jupiter_circumference', 'all', 449197000, 'Tour de Jupiter', 'Le tour de Jupiter à l''équateur : 449 197 km. La plus grande planète du système solaire abrite la Grande Tache rouge, une tempête plus large que la Terre observée depuis plus de 150 ans.', 'astronomy', 'tornado', 17),
        ('sun_circumference', 'all', 4371212000, 'Tour du Soleil', 'Le tour du Soleil à l''équateur : environ 4,37 millions de km. Notre étoile pourrait contenir plus d''un million de Terres, et sa lumière met un peu plus de 8 minutes à nous parvenir.', 'astronomy', 'sun', 18),
        ('paris_ring_road', 'run', 35000, 'Périphérique parisien', 'Le boulevard périphérique fait le tour de Paris sur 35 km. Achevé en 1973, il voit passer chaque jour plus d''un million de véhicules, bien plus vite que toi, mais rarement plus librement.', NULL, 'car', 19),
        ('marathon', 'run', 42195, 'Marathon', '42,195 km : la distance courue aux Jeux olympiques de Londres en 1908, du château de Windsor au stade, devenue officielle en 1921. Elle rend hommage au messager grec qui aurait couru de Marathon à Athènes.', NULL, 'medal', 20),
        ('lake_geneva', 'run', 175000, 'Tour du Léman', 'Le Léman, partagé entre la France et la Suisse, est l''un des plus grands lacs d''Europe de l''Ouest. Son tour fait environ 175 km, de Genève à Lausanne et Montreux, puis par Évian et Thonon.', NULL, 'waves', 21),
        ('tour_du_mont_blanc', 'hike', 170000, 'Tour du Mont-Blanc', 'Le tour du Mont-Blanc fait le tour du plus haut sommet des Alpes à travers la France, l''Italie et la Suisse : environ 170 km et 10 000 m de dénivelé positif, en général parcourus en une dizaine de jours.', 'gr', 'mountain-snow', 22),
        ('gr20', 'hike', 180000, 'GR20', 'Le GR20 traverse la Corse du nord au sud, de Calenzana à Conca, sur environ 180 km et plus de 12 000 m de dénivelé positif. Il est réputé être l''un des sentiers de grande randonnée les plus exigeants d''Europe.', 'gr', 'mountain', 23),
        ('gr54', 'hike', 180000, 'GR54 – Tour de l''Oisans', 'Le GR54 fait le tour du massif des Écrins et de l''Oisans en environ 180 km. Exigeant, il franchit une douzaine de cols, souvent au-dessus de 2 000 m d''altitude.', 'gr', 'tent', 24),
        ('gr70', 'hike', 270000, 'GR70 – Chemin de Stevenson', 'Le GR70 suit les pas de l''écrivain Robert Louis Stevenson, qui traversa les Cévennes avec son ânesse Modestine en 1878. Il relie Le Puy-en-Velay à Alès sur environ 270 km.', 'gr', 'trees', 25),
        ('gr5', 'hike', 650000, 'GR5 – Traversée des Alpes', 'Le GR5 relie la mer du Nord à la Méditerranée. Sa section la plus célèbre traverse les Alpes du lac Léman à Nice, sur environ 650 km et des dizaines de cols, par la Vanoise et le Mercantour.', 'gr', 'map', 26),
        ('gr65', 'hike', 750000, 'GR65 – Via Podiensis', 'Le GR65 suit la via Podiensis, le plus fréquenté des chemins de Compostelle en France, du Puy-en-Velay à Saint-Jean-Pied-de-Port : environ 750 km par l''Aubrac, Conques et le Quercy.', 'gr', 'signpost', 27),
        ('gr10', 'hike', 870000, 'GR10 – Traversée des Pyrénées', 'Le GR10 traverse les Pyrénées françaises d''Hendaye, sur l''Atlantique, à Banyuls-sur-Mer, sur la Méditerranée : environ 870 km et près de 50 000 m de dénivelé positif.', 'gr', 'sunrise', 28),
        ('camino_vezelay', 'hike', 900000, 'Compostelle depuis Vézelay', 'La voie de Vézelay (GR654), l''un des quatre grands chemins de Compostelle en France, mène de la basilique de Vézelay à Saint-Jean-Pied-de-Port, au pied des Pyrénées : environ 900 km à travers le Berry, le Limousin et le Périgord.', 'gr', 'shell', 29),
        ('gr34', 'hike', 2000000, 'GR34 – Sentier des douaniers', 'Le GR34, ou sentier des douaniers, longe la côte bretonne du Mont-Saint-Michel à Saint-Nazaire. Tracé à la fin du XVIIIᵉ siècle pour surveiller la contrebande, il s''étire sur environ 2 000 km de falaises et de criques.', 'gr', 'lighthouse', 30),
        ('hexatrek', 'hike', 3000000, 'HexaTrek', 'Créé en 2022, l''HexaTrek traverse la France de l''Alsace au Pays basque sur environ 3 000 km, par les Vosges, le Jura, les Alpes, les Cévennes et les Pyrénées, en reliant de nombreux parcs naturels.', NULL, 'hexagon', 31),
        ('pacific_crest_trail', 'hike', 4270000, 'Pacific Crest Trail', 'Le Pacific Crest Trail longe l''ouest des États-Unis, de la frontière mexicaine au Canada, à travers la Californie, l''Oregon et l''État de Washington : 4 270 km que les randonneurs parcourent en général en cinq mois.', NULL, 'tree-pine', 32),
        ('vuelta', 'ride', 3300000, 'Tour d''Espagne', 'Le Tour d''Espagne, ou Vuelta, couvre chaque fin d''été environ 3 300 km en 21 étapes depuis 1935. Son leader porte le maillot rouge, et ses arrivées au sommet comptent parmi les plus raides du cyclisme.', 'grand_tours', 'trophy', 33),
        ('giro', 'ride', 3400000, 'Tour d''Italie', 'Le Tour d''Italie, ou Giro, parcourt chaque printemps environ 3 400 km en 21 étapes depuis 1909. Son leader porte le maillot rose, couleur des pages de La Gazzetta dello Sport, le journal qui l''a créé.', 'grand_tours', 'flower', 34),
        ('tour_de_france', 'ride', 3500000, 'Tour de France', 'Depuis 1903, le Tour de France couvre chaque été environ 3 500 km en 21 étapes. Les coureurs le bouclent en trois semaines, à plus de 40 km/h de moyenne.', 'grand_tours', 'bike', 35),
        ('trans_siberian', 'ride', 9289000, 'Transsibérien', 'Le Transsibérien relie Moscou à Vladivostok sur 9 289 km : la plus longue ligne de chemin de fer du monde, qui traverse sept fuseaux horaires en une semaine de train.', NULL, 'train-front', 36),
        ('pan_american_highway', 'ride', 24000000, 'Route panaméricaine', 'La route panaméricaine traverse le continent américain, de l''Alaska à la pointe sud de l''Argentine. Elle n''est interrompue qu''une fois, par le bouchon du Darién, une jungle entre le Panama et la Colombie.', NULL, 'route', 37)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_favorite_badges" DROP CONSTRAINT "FK_932cb72a53d2288b8f7d962319b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_favorite_badges" DROP CONSTRAINT "FK_5182d15bfb2f898836b698f56bf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "badges" DROP CONSTRAINT "FK_b79d812b201834dd6792c9b3ec5"`,
    );
    await queryRunner.query(`DROP TABLE "user_favorite_badges"`);
    await queryRunner.query(`DROP TABLE "badges"`);
    await queryRunner.query(`DROP TABLE "badge_themes"`);
  }
}
