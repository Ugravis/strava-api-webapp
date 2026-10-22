import { Injectable, Logger } from '@nestjs/common';

/** A city to pick for a profile. */
export interface CitySuggestion {
  name: string;
  /** ISO 3166-1 alpha-2, uppercase. */
  countryCode: string;
  /** Region, to tell apart cities of the same name. */
  region: string | null;
}

interface PhotonResponse {
  features: {
    properties: {
      name?: string;
      countrycode?: string;
      state?: string;
    };
  }[];
}

/** Photon: geocoding over OpenStreetMap data, by komoot. */
const PHOTON_URL = 'https://photon.komoot.io/api/';
const LIMIT = 6;
const TIMEOUT_MS = 4_000;

/**
 * Suggests cities by name, for the profile. Queried by the server, so that
 * the browsers of the users never reach the geocoder.
 */
@Injectable()
export class CitySearchService {
  private readonly logger = new Logger(CitySearchService.name);

  async search(query: string): Promise<CitySuggestion[]> {
    const url = new URL(PHOTON_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(LIMIT * 2));
    url.searchParams.set('lang', 'fr');
    url.searchParams.set('layer', 'city');
    let body: PhotonResponse;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`Photon answered ${response.status}`);
      }
      body = (await response.json()) as PhotonResponse;
    } catch (error) {
      this.logger.warn(`City search failed: ${String(error)}`);
      return [];
    }
    const seen = new Set<string>();
    const cities: CitySuggestion[] = [];
    for (const { properties } of body.features) {
      const { name, countrycode, state } = properties;
      if (!name || !countrycode) continue;
      const key = `${name}|${countrycode}|${state ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cities.push({
        name,
        countryCode: countrycode.toUpperCase(),
        region: state ?? null,
      });
      if (cities.length === LIMIT) break;
    }
    return cities;
  }
}
