import { apiRequest } from "@/lib/api/client";
import type { CountriesCompletion, CountryOutlines } from "@/lib/api/types";

export const countriesService = {
  getCompletion: () => apiRequest<CountriesCompletion>("/countries"),

  getOutlines: () => apiRequest<CountryOutlines>("/countries/outlines"),
};
