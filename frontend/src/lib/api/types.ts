export interface User {
  id: string;
  email: string;
  username: string;
  /** Optional: use `publicNameOf` to display a user. */
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  /** Country of the city, ISO 3166-1 alpha-2. */
  countryCode: string | null;
  favoriteSports: FavoriteSport[];
  /** Hue of the profile, `#rrggbb`; null for the default one. */
  profileColor: string | null;
  profilePrivate: boolean;
  hasPassword: boolean;
  createdAt: string;
}

/** A city to pick for a profile. */
export interface CitySuggestion {
  name: string;
  countryCode: string;
  /** Region, to tell apart cities of the same name. */
  region: string | null;
}

/** Sports a user may show as favorites: the families of the distance badges, `all` excepted. */
export type FavoriteSport = Exclude<DistanceFamily, "all">;

export interface PendingGoogleSignup {
  email: string;
  suggestedUsername: string;
}

export type UsernameAvailability =
  | { available: true }
  | { available: false; reason: "invalid" | "reserved" | "taken" };

export type SyncJobStatus = "queued" | "running" | "completed" | "failed";

export interface SyncJob {
  kind: "backfill" | "reconcile";
  status: SyncJobStatus;
  processed: number;
  /** Known once the import is over. */
  total: number | null;
  /** Set while the job waits for the Strava quota or a retry. */
  waitingUntil: string | null;
  errorCode: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface StravaConnectionStatus {
  /** False when Strava is not configured on the server. */
  available: boolean;
  connection: {
    accountName: string | null;
    privateActivitiesGranted: boolean;
    connectedAt: string;
    lastSyncedAt: string | null;
  } | null;
  sync: SyncJob | null;
  /** Tile computation of the imported activities; null without connection. */
  tiles: TileProgress | null;
}

export interface TileProgress {
  activities: number;
  /** Activities whose tiles are computed, at least from the simplified track. */
  computed: number;
  /** Activities awaiting their full track to refine their tiles. */
  refining: number;
}

export interface ActivityStats {
  count: number;
  totalDistanceM: number;
  totalElevationGainM: number;
  totalMovingTimeS: number;
}

/** An activity in the list of the latest ones. */
export interface RecentActivity {
  id: string;
  name: string;
  sportType: string;
  startedAt: string;
  distanceM: number;
  movingTimeS: number;
  elevationGainM: number | null;
}

/** Activities of one day, in the time zone where each one started. */
export interface ActivityDay {
  /** Local date, `YYYY-MM-DD`. */
  date: string;
  count: number;
  distanceM: number;
  movingTimeS: number;
}

/** Totals of one sport over every activity. */
export interface SportTotals {
  sportType: string;
  count: number;
  distanceM: number;
  movingTimeS: number;
}

/** What the home page shows of the activities, besides their totals. */
export interface ActivitiesOverview {
  /** Latest activities, the most recent first. */
  recent: RecentActivity[];
  /** Days with activities over about the last year, oldest first. */
  days: ActivityDay[];
  /** Sports practiced, the most practiced (by moving time) first. */
  sports: SportTotals[];
  /** Start of the first activity, ISO 8601; null without activities. */
  firstActivityAt: string | null;
}

/** Families of sports followed month by month; `other` gathers the remaining sports. */
export type MonthlyFamily = "ride" | "run" | "hike" | "swim" | "other";

/** Distance of one month, in the time zone where each activity started. */
export interface MonthDistance {
  /** Local month, `YYYY-MM`. */
  month: string;
  distanceM: number;
  /** Distance of each family of sports. */
  families: Record<MonthlyFamily, number>;
}

/** Groups of sports compared to landmarks; `all` counts every activity. */
export type DistanceFamily = "all" | "run" | "hike" | "ride" | "swim";

/** A theme gathering badges across families, e.g. astronomy. */
export interface BadgeTheme {
  id: string;
  name: string;
}

/** What a badge counts: distance in meters, time in seconds, elevation in meters, or a count. */
export type BadgeMetric =
  | "distance"
  | "time"
  | "elevation"
  | "activities"
  | "active_days"
  | "tiles"
  | "subtiles"
  | "stations";

/** Background of a badge card: a color (`#rrggbb`) or an image. */
export type BadgeBackground = { kind: "color"; color: string } | { kind: "image"; url: string };

/** A known amount compared to the cumulated amount of a metric, with the progress of the user. */
export interface DistanceBadge {
  id: string;
  metric: BadgeMetric;
  family: DistanceFamily;
  /** Amounts reaching each tier of a badge completed only once, ascending; null for a repeatable badge. */
  tiers: number[] | null;
  name: string;
  description: string;
  /** Icon key; unknown keys get a generic icon. */
  icon: string;
  /** Theme of the badge, among those of the overview; null without theme. */
  themeId: string | null;
  /** Background of its card; null for the default one. */
  background: BadgeBackground | null;
  /** When the badge joined the catalog. */
  addedAt: string;
  /** Number of iterations completed, or of tiers reached. */
  completions: number;
  /** Share of the current iteration or of the way to the next tier, in [0, 1); 1 once the last tier is reached. */
  progress: number;
  /** Amount counted toward the goal, in the unit of the metric. */
  covered: number;
  /** Amount of the current goal: the iteration, or the next tier (the last one when reached). */
  goal: number;
  /** Start of the activity that completed the first iteration. */
  firstCompletedAt: string | null;
  /** Start of the activity that completed the latest iteration. */
  lastCompletedAt: string | null;
  /** Rank among the favorites, from 1; null when not a favorite. */
  favoritePosition: number | null;
  /** Whether the user shows the badge on their profile. */
  onProfile: boolean;
}

export interface DistancesOverview {
  /** Cumulated amount per metric and family, in the unit of the metric. */
  totals: Record<BadgeMetric, Record<DistanceFamily, number>>;
  /** Themes having badges, in display order. */
  themes: BadgeTheme[];
  /** Every badge, in display order. */
  badges: DistanceBadge[];
}

export interface BadgeCompletion {
  /** Iteration completed, from 1. */
  iteration: number;
  /** The activity that completed it. */
  activity: { id: string; name: string; sportType: string; startedAt: string };
}

export interface DistanceBadgeDetails extends DistanceBadge {
  /** Amount reached by the family of the badge, in the unit of its metric. */
  familyTotal: number;
  /** Amount left before the next iteration, in the unit of its metric. */
  remaining: number;
  /** At the pace of the last 90 days; null without recent activity. */
  estimatedNextAt: string | null;
  /** First completed iterations, the latest first; the others come from the pages of the history. */
  history: BadgeCompletion[];
}

/** Activity expected to have a real-world track. */
export interface MappableActivity {
  id: string;
  startedAt: string;
}

export interface ActivityTracksPage {
  tracks: {
    activityId: string;
    /** Google encoded polyline, or null when the activity has no GPS track. */
    polyline: string | null;
  }[];
  /** True when a further page may hold more tracks. */
  hasMore: boolean;
}

export interface TileLevelStats {
  /** Tiles crossed at least once. */
  visited: number;
  /** Side of the largest square of visited tiles. */
  maxSquare: number;
  /** Tiles of the largest cluster. */
  maxCluster: number;
  /** Visited tiles whose four neighbors are visited too. */
  clustered: number;
}

export interface TileStats {
  /** Large tiles (zoom 14). */
  tiles: TileLevelStats;
  /** Small tiles (zoom 17). */
  subtiles: TileLevelStats;
}

/** Top-left tile and side of a square made of visited tiles. */
export interface TileSquare {
  x: number;
  y: number;
  size: number;
}

/** Counters and achievements of one level of tiles. */
export interface TileLevelSummary {
  /** Tiles crossed at least once. */
  visited: number;
  /** Largest square of visited tiles; null without tiles. */
  maxSquare: TileSquare | null;
  /** Tiles of the largest cluster. */
  maxCluster: number;
  /** Visited tiles whose four neighbors are visited too. */
  clustered: number;
}

export interface TilesSummary {
  /** Changes whenever the tiles change: the vector tiles of the map are cached until it does. */
  version: string;
  /** False while the achievements of the latest tiles are being computed. */
  upToDate: boolean;
  /** Large tiles (zoom 14). */
  tiles: TileLevelSummary;
  /** Small tiles (zoom 17). */
  subtiles: TileLevelSummary;
}

/** What the map shows about one tile, at the level of its zoom. */
export interface TileDetails {
  visited: boolean;
  /** Small tiles explored inside a large tile; null for a small tile. */
  subtiles: number | null;
  /** Its four neighbors are visited too. */
  clustered: boolean;
  inMaxCluster: boolean;
  inMaxSquare: boolean;
}

/** Activities that crossed one tile. */
export interface TileVisits {
  activities: number;
  firstVisitedAt: string | null;
  lastVisitedAt: string | null;
  tile: TileDetails;
}

/** An activity that crossed a tile. */
export interface TileActivity {
  id: string;
  name: string;
  sportType: string;
  startedAt: string;
  distanceM: number;
  movingTimeS: number;
  elevationGainM: number | null;
  /** Identifier of the activity on Strava, to link to it. */
  stravaId: string | null;
}

/** An activity of the user, as shown on its own. */
export interface ActivityDetails {
  id: string;
  name: string;
  sportType: string;
  startedAt: string;
  /** IANA time zone of the start. */
  timezone: string | null;
  distanceM: number;
  movingTimeS: number;
  elapsedTimeS: number;
  elevationGainM: number | null;
  /** Identifier of the activity on Strava, to link to it. */
  stravaId: string | null;
}

/** What an activity brought to one level of tiles when it was recorded. */
export interface LevelGains {
  /** Tiles no earlier activity had crossed, as `[x, y]` pairs. */
  gained: [number, number][];
  /** Growth of the side of the largest square. */
  maxSquare: number;
  /** Growth of the largest cluster. */
  maxCluster: number;
  /** Tiles that became cluster tiles outside of the largest cluster. */
  otherClusters: number;
}

/** Tiles crossed by one activity, as `[x, y]` pairs of each level. */
export interface ActivityTiles {
  /** Large tiles (zoom 14). */
  tiles: [number, number][];
  /** Small tiles (zoom 17). */
  subtiles: [number, number][];
  /** What the activity brought when it was recorded; null until computed. */
  gains: { tiles: LevelGains; subtiles: LevelGains } | null;
}

/** A page of the activities that crossed a tile, the latest ones first. */
export interface TileActivitiesPage {
  items: TileActivity[];
  /** Cursor of the next page; null on the last one. */
  next: string | null;
}

/** Tiles of one level touching a country, and those visited. */
export interface CountryLevelCompletion {
  visited: number;
  /** Null while the total is being computed. */
  total: number | null;
}

/** Completion of a country visited by the user. */
export interface CountryCompletion {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  /** Large tiles (zoom 14). */
  tiles: CountryLevelCompletion;
  /** Small tiles (zoom 17). */
  subtiles: CountryLevelCompletion;
}

export interface CountriesCompletion {
  /** Most visited first. */
  countries: CountryCompletion[];
  /** Visited large tiles whose countries are not known yet. */
  pendingTiles: number;
  /** Changes with the shapes of the countries drawn on the map; null without shapes. */
  shapesVersion: string | null;
}

/** A country seen as a sector of the map: the tiles of the user in it and its visits. */
export interface CountrySector {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  /** Large tiles (zoom 14). */
  tiles: CountryLevelCompletion;
  /** Small tiles (zoom 17). */
  subtiles: CountryLevelCompletion;
  /** Start of the first activity that gained a small tile in it, ISO 8601; null without any. */
  firstVisitAt: string | null;
  /** Start of the latest activity that crossed it, ISO 8601; null without any. */
  lastVisitAt: string | null;
  /** Main landmass, `[west, south, east, north]` in degrees; null without land. */
  bounds: [number, number, number, number] | null;
  /** Changes with its tile shape, which dims the rest of the map; null while it is being computed. */
  shapeVersion: string | null;
  /** Its railway network; null when no link crosses it. */
  /** Train stations of the country and those visited; null without any. */
  stations: CountryStations | null;
  railway: CountryRailway | null;
}

/** Which tiles the history shows: those first visited since a date, or the map as it was at that date. */
export type HistoryMode = "gained" | "state";

/** Tiles of the history at a date. */
export interface TileHistorySummary {
  /** Version of the tiles whose first visits are known: the map tiles of the history change with it. Null until known. */
  version: string | null;
  /** False while the first visits of the latest tiles are being computed. */
  upToDate: boolean;
  /** Start of the first activity that crossed a tile, ISO 8601; null without tiles. */
  firstVisitAt: string | null;
  /** Large tiles (zoom 14) gained since the date, or visited before it. */
  tiles: number;
  /** Small tiles (zoom 17) gained since the date, or visited before it. */
  subtiles: number;
  /** Train stations first visited since the date, or before it. */
  stations: number;
  /** Meters of railway unlocked since the date, or before it. */
  railwayM: number;
}

/** What the activities of one day brought to the tiles. */
export interface TileTimelineDay {
  /** UTC date of the activities, `YYYY-MM-DD`. */
  date: string;
  tiles: number;
  subtiles: number;
  /** Growth of the side of the largest squares. */
  maxSquareTiles: number;
  maxSquareSubtiles: number;
  /** Growth of the largest clusters. */
  maxClusterTiles: number;
  maxClusterSubtiles: number;
}

/** A train station whose small tile the user visited. */
export interface VisitedStation {
  id: number;
  name: string | null;
  lon: number;
  lat: number;
  /** Start of the first activity crossing its small tile, ISO 8601; null until the first visits are replayed. */
  firstVisitAt: string | null;
}

/** Two visited stations linked by the railway, without any station between them. */
export interface UnlockedLink {
  id: number;
  stations: [number, number];
  lengthM: number;
  /** `[lon, lat]` along the tracks. */
  coords: [number, number][];
}

/** Stations visited by the user and the links between them. */
export interface VisitedStations {
  stations: VisitedStation[];
  links: UnlockedLink[];
  /** Changes with each import of the stations: the vector tiles of all the stations follow it. Null without stations. */
  stationsVersion: string | null;
}

/** A station next to another on the railway. */
export interface StationNeighbor {
  id: number;
  name: string | null;
  lon: number;
  lat: number;
  lengthM: number;
  /** Whether the user visited it too, unlocking the link. */
  visited: boolean;
}

/** A station, whether the user visited it, and its neighbors on the railway. */
export interface StationDetails {
  id: number;
  name: string | null;
  lon: number;
  lat: number;
  /** Small tile (zoom 17) holding the station: visiting it visits the station. */
  tile: { zoom: 17; x: number; y: number };
  visited: boolean;
  firstVisitAt: string | null;
  neighbors: StationNeighbor[];
}

/** The train stations of a country and those the user visited. */
export interface CountryStations {
  visited: number;
  total: number;
}

/** The railway network of a country and the part the user unlocked. */
export interface CountryRailway {
  /** Length of the links between two stations the user visited, in the country. */
  unlockedM: number;
  totalM: number;
}

/** What any signed-in user may see of another one. */
export interface PublicUser {
  id: string;
  username: string;
  /** Optional: use `publicNameOf` to display a user. */
  displayName: string | null;
  avatarUrl: string | null;
}

/** Another user as the current one sees them in a list. */
export interface ProfileSummary extends PublicUser {
  /** Whether the current user follows them. */
  followed: boolean;
  /** Whether the current user asked to follow their private profile, not accepted yet. */
  requested: boolean;
}

/** Badge owed to the membership, not to sport: `founder` and `team` by hand, `early_member` for the first 100 accounts. */
export type DistinctionKind = "founder" | "team" | "early_member";

export interface Distinction {
  kind: DistinctionKind;
  awardedAt: string;
}

/** A badge shown on a profile, as other users see it. */
export type ProfileBadge = Pick<
  DistanceBadge,
  "id" | "name" | "description" | "icon" | "family" | "tiers" | "completions" | "progress"
>;

/** Figures of the tiles at one level. */
export interface TileFigures {
  visited: number;
  maxCluster: number;
  maxSquare: number;
}

/** Badges chosen by the user and overall figures, never an activity nor a place. */
export interface ProfileShowcase {
  badges: ProfileBadge[];
  tiles: { large: TileFigures; small: TileFigures };
  stations: { visited: number; unlockedKm: number };
}

export interface PublicProfile extends ProfileSummary {
  createdAt: string;
  bio: string | null;
  city: string | null;
  countryCode: string | null;
  favoriteSports: FavoriteSport[];
  /** `#rrggbb`; null for the default hue. */
  color: string | null;
  private: boolean;
  /** Badges of the membership, shown even on a private profile. */
  distinctions: Distinction[];
  /** False for a private profile the current user does not follow: its showcase and follows are hidden. */
  visible: boolean;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  /** Whether the current user likes the profile; who likes it is never told. */
  liked: boolean;
  /** Whether they follow the current user. */
  followsViewer: boolean;
  /** Whether it is the profile of the current user. */
  self: boolean;
  /** Null when hidden, or when showcases are disabled. */
  showcase: ProfileShowcase | null;
  /** Follow requests waiting for the current user; null on the profile of someone else. */
  requestsCount: number | null;
}

/** Following a public profile is immediate; following a private one is a request. */
export type FollowStatus = "following" | "requested";

export type FollowDirection = "followers" | "following";

export type NotificationType = "follow" | "follow_request" | "follow_accepted" | "profile_like";

export interface AppNotification {
  id: string;
  type: NotificationType;
  /** Null for an anonymous kind: who liked a profile is never told. */
  actor: PublicUser | null;
  read: boolean;
  createdAt: string;
}

/** Filters of the notifications list. */
export type NotificationCategory = "all" | "likes" | "follows";

export interface NotificationsPage {
  notifications: AppNotification[];
  /** Whether older notifications follow. */
  hasMore: boolean;
  unreadCount: number;
}

/**
 * Event received in real time: the new unread count, with the notification
 * that changed it, if one was added, or the ones marked read.
 */
export interface NotificationEvent {
  unreadCount: number;
  notification?: AppNotification;
  /** Marked read; every notification when empty. */
  read?: string[];
}
