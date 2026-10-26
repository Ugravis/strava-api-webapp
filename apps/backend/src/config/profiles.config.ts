import { registerAs } from '@nestjs/config';

export interface ProfilesConfig {
  /**
   * Shows the badges and statistics of a profile to other users. Derived
   * from Strava data, they can be hidden at once, should the Strava API
   * policy require it (`PROFILE_SHOWCASE_ENABLED=false`).
   */
  showcaseEnabled: boolean;
}

export default registerAs('profiles', (): ProfilesConfig => ({
  showcaseEnabled: process.env.PROFILE_SHOWCASE_ENABLED !== 'false',
}));
