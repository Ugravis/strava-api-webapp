import { apiRequest } from "@/lib/api/client";
import type { CountriesCompletion, CountrySector } from "@/lib/api/types";

export const countriesService = {
  getCompletion: () => apiRequest<CountriesCompletion>("/countries"),
  /** Codes of every country, visited or not. */
  getCodes: () => apiRequest<string[]>("/countries/codes"),
  getSector: (code: string) => apiRequest<CountrySector>(`/countries/${code}/sector`),
};
