import { Inject, Injectable } from '@nestjs/common';
import profilesConfig, { type ProfilesConfig } from '../config/profiles.config';
import {
  DistancesService,
  type ProfileBadge,
} from '../distances/distances.service';
import { StationsService } from '../stations/stations.service';
import type { StoredLevelMetrics } from '../tiles/tile-metrics';
import { UserTilesService } from '../tiles/user-tiles.service';

/** Figures of the tiles at one level. */
export interface TileFigures {
  visited: number;
  maxCluster: number;
  maxSquare: number;
}

/** Achievements a profile shows: badges chosen by the user and overall figures, never an activity nor a place. */
export interface ProfileShowcase {
  badges: ProfileBadge[];
  tiles: { large: TileFigures; small: TileFigures };
  stations: { visited: number; unlockedKm: number };
}

const figuresOf = (level: StoredLevelMetrics): TileFigures => ({
  visited: level.visited,
  maxCluster: level.maxCluster,
  maxSquare: level.maxSquare?.size ?? 0,
});

@Injectable()
export class ProfileShowcaseService {
  constructor(
    @Inject(profilesConfig.KEY) private readonly config: ProfilesConfig,
    private readonly distances: DistancesService,
    private readonly userTiles: UserTilesService,
    private readonly stations: StationsService,
  ) {}

  /** Null when showcases are disabled. */
  async of(userId: string): Promise<ProfileShowcase | null> {
    if (!this.config.showcaseEnabled) {
      return null;
    }
    const [badges, { tiles, subtiles }, stations] = await Promise.all([
      this.distances.shownOnProfile(userId),
      this.userTiles.summary(userId),
      this.stations.totals(userId),
    ]);
    return {
      badges,
      tiles: { large: figuresOf(tiles), small: figuresOf(subtiles) },
      stations: {
        visited: stations.visited,
        unlockedKm: Math.round(stations.unlockedM / 1000),
      },
    };
  }
}
