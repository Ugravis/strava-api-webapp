import { apiRequest } from "@/lib/api/client";
import type { CountriesCompletion, CountrySector } from "@/lib/api/types";

export const countriesService = {
  getCompletion: () => apiRequest<CountriesCompletion>("/countries"),
  /** Codes of every country, visited or not. */
  getCodes: () => apiRequest<string[]>("/countries/codes"),
  /** Code of the country under a point, in degrees; null at sea. */
  getCountryAt: (lon: number, lat: number) =>
    apiRequest<{ code: string | null }>(`/countries/at?lon=${lon}&lat=${lat}`),
  getSector: (code: string) => apiRequest<CountrySector>(`/countries/${code}/sector`),
};
