import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { PasswordHasher } from '../auth/password-hasher.service';
import {
  type LatLng,
  SUBTILE_ZOOM,
  TileSet,
  tilePosition,
  toSignedMask,
} from '../tiles/tile-grid';
import dataSource from './data-source';

/**
 * Development only: (re)creates the account `bench` with a synthetic
 * history of about 500,000 small tiles spread over about 50 countries, to
 * measure the map and the API with a large history. Every activity is a
 * random walk on the grid of small tiles; usual routes are ridden again, as
 * in a real history. The countries are located and their totals computed by
 * the background worker, as for any user.
 * Usage: `pnpm db:seed:bench [small tiles]` from the repository root.
 */
export const BENCH_ACCOUNT = {
  email: 'bench@example.com',
  username: 'bench',
  password: 'BenchPassword123!',
};

const DEFAULT_TARGET = 500_000;
/** Activities riding again a route of the home area: many rows, no new tile. */
const REPEATED_ROUTES = 8_000;
const INSERT_BATCH = 5_000;
const KM_PER_DEGREE = 111;
const DIRECTIONS: [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/** Areas where the activities start: center, weight and spread in kilometers. */
const AREAS: { center: LatLng; weight: number; spreadKm: number }[] = [
  [45.76, 4.84, 0.5, 30],
  [48.85, 2.35, 0.05, 40],
  [43.6, 1.44, 0.03, 40],
  [44.84, -0.58, 0.02, 40],
  [47.22, -1.55, 0.02, 40],
  [43.3, 5.37, 0.03, 40],
  [45.19, 5.72, 0.04, 30],
  [46.2, 6.14, 0.03, 30],
  [46.95, 7.45, 0.02, 40],
  [45.46, 9.19, 0.01, 40],
  [41.9, 12.5, 0.01, 40],
  [40.42, -3.7, 0.01, 40],
  [41.39, 2.17, 0.01, 40],
  [38.72, -9.14, 0.01, 40],
  [50.85, 4.35, 0.01, 40],
  [52.37, 4.9, 0.01, 40],
  [49.61, 6.13, 0.005, 20],
  [52.52, 13.4, 0.01, 40],
  [48.14, 11.58, 0.01, 40],
  [48.21, 16.37, 0.01, 40],
  [50.08, 14.43, 0.005, 40],
  [47.5, 19.04, 0.005, 40],
  [52.23, 21.01, 0.005, 40],
  [55.68, 12.57, 0.005, 40],
  [59.33, 18.07, 0.005, 40],
  [59.91, 10.75, 0.005, 60],
  [60.17, 24.94, 0.005, 40],
  [64.15, -21.94, 0.005, 60],
  [51.51, -0.13, 0.01, 40],
  [53.35, -6.26, 0.005, 40],
  [55.95, -3.19, 0.005, 40],
  [37.98, 23.73, 0.005, 40],
  [45.81, 15.98, 0.005, 40],
  [46.05, 14.51, 0.005, 30],
  [44.43, 26.1, 0.003, 40],
  [42.7, 23.32, 0.003, 40],
  [41.01, 28.98, 0.003, 40],
  [43.73, 7.42, 0.002, 3],
  [42.51, 1.52, 0.002, 10],
  [35.9, 14.51, 0.002, 10],
  [31.63, -8.0, 0.003, 60],
  [36.81, 10.18, 0.003, 40],
  [40.71, -74.0, 0.004, 60],
  [37.77, -122.42, 0.004, 60],
  [45.5, -73.57, 0.003, 60],
  [49.28, -123.12, 0.003, 60],
  [35.68, 139.69, 0.003, 60],
  [-33.87, 151.21, 0.003, 60],
  [-36.85, 174.76, 0.003, 60],
  [-22.91, -43.17, 0.002, 40],
  [-33.92, 18.42, 0.002, 40],
  [13.75, 100.5, 0.002, 40],
].map(([lat, lng, weight, spreadKm]) => ({
  center: [lat, lng],
  weight,
  spreadKm,
}));

/** Deterministic: the same history at every run. */
function generator(seed: number) {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const gaussian = () =>
    Math.sqrt(-2 * Math.log(random() + 1e-12)) *
    Math.cos(2 * Math.PI * random());
  return { random, gaussian };
}

interface SyntheticActivity {
  tiles: TileSet;
  steps: number;
}

function syntheticHistory(target: number): SyntheticActivity[] {
  const { random, gaussian } = generator(42);
  const totalWeight = AREAS.reduce((sum, area) => sum + area.weight, 0);
  const visited = new Set<number>();
  const activities: SyntheticActivity[] = [];
  const home: SyntheticActivity[] = [];
  while (visited.size < target) {
    let pick = random() * totalWeight;
    const area = AREAS.find((candidate) => (pick -= candidate.weight) <= 0);
    const { center, spreadKm } = area ?? AREAS[0];
    const start: LatLng = [
      center[0] + (gaussian() * spreadKm) / KM_PER_DEGREE,
      center[1] +
        (gaussian() * spreadKm) /
          (KM_PER_DEGREE * Math.cos((center[0] * Math.PI) / 180)),
    ];
    let [x, y] = tilePosition(start, SUBTILE_ZOOM).map(Math.floor);
    let direction = Math.floor(random() * DIRECTIONS.length);
    const steps = 80 + Math.floor(random() ** 2 * 900);
    const tiles = new TileSet();
    for (let step = 0; step < steps; step++) {
      tiles.add(x, y);
      visited.add(y * 2 ** SUBTILE_ZOOM + x);
      const turn = random();
      if (turn < 0.15) direction = (direction + 1) % DIRECTIONS.length;
      else if (turn < 0.3) direction = (direction + 7) % DIRECTIONS.length;
      x += DIRECTIONS[direction][0];
      y += DIRECTIONS[direction][1];
    }
    const activity = { tiles, steps };
    activities.push(activity);
    if (area === AREAS[0]) home.push(activity);
  }
  for (let i = 0; i < REPEATED_ROUTES; i++) {
    activities.push(home[Math.floor(random() ** 3 * home.length)]);
  }
  return activities;
}

async function seedBench(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed the database when NODE_ENV=production');
  }
  const target = Number(process.argv[2] ?? DEFAULT_TARGET);
  const history = syntheticHistory(target);
  const passwordHash = await new PasswordHasher().hash(BENCH_ACCOUNT.password);

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM users WHERE email = $1', [
        BENCH_ACCOUNT.email,
      ]);
      const [user]: { id: string }[] = await manager.query(
        `INSERT INTO users (email, username, password_hash, display_name, terms_accepted_at)
         VALUES ($1, $2, $3, 'Bench', now()) RETURNING id`,
        [BENCH_ACCOUNT.email, BENCH_ACCOUNT.username, passwordHash],
      );
      const firstDay = Date.parse('2014-01-01');
      const ids = history.map(() => randomUUID());
      for (let from = 0; from < history.length; from += INSERT_BATCH) {
        const batch = history.slice(from, from + INSERT_BATCH);
        const batchIds = ids.slice(from, from + INSERT_BATCH);
        await manager.query(
          `INSERT INTO activities (id, user_id, sport_type, name, started_at,
             distance_m, moving_time_s, elapsed_time_s)
           SELECT a.id, $1, 'Ride', 'Synthetic ' || a.n, a.started_at, a.steps * 180, a.steps * 30, a.steps * 33
           FROM unnest($2::uuid[], $3::int[], $4::timestamptz[], $5::int[])
             AS a(id, n, started_at, steps)`,
          [
            user.id,
            batchIds,
            batch.map((_, i) => from + i),
            batch.map((_, i) =>
              new Date(
                firstDay +
                  ((from + i) / history.length) * (Date.now() - firstDay),
              ).toISOString(),
            ),
            batch.map((activity) => activity.steps),
          ],
        );
        await manager.query(
          `INSERT INTO activity_tile_states (activity_id, status, precision)
           SELECT id, 'done', 'summary' FROM unnest($1::uuid[]) AS id`,
          [batchIds],
        );
        const rows = batch.flatMap((activity, i) =>
          activity.tiles.cells().map((cell) => ({ id: batchIds[i], ...cell })),
        );
        await manager.query(
          `INSERT INTO activity_tiles (activity_id, user_id, x, y, mask, shared_mask)
           SELECT t.id, $1, t.x, t.y, t.mask, t.mask
           FROM unnest($2::uuid[], $3::int[], $4::int[], $5::bigint[]) AS t(id, x, y, mask)`,
          [
            user.id,
            rows.map((row) => row.id),
            rows.map((row) => row.x),
            rows.map((row) => row.y),
            rows.map((row) => toSignedMask(row.mask)),
          ],
        );
      }
    });
  } finally {
    await dataSource.destroy();
  }
  console.log(
    `Account "${BENCH_ACCOUNT.username}" (${BENCH_ACCOUNT.email}, password ${BENCH_ACCOUNT.password}): ${history.length} activities, at least ${target} small tiles.`,
  );
}

seedBench().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
