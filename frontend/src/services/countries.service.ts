import { apiRequest } from "@/lib/api/client";
import type { CountriesCompletion } from "@/lib/api/types";

export const countriesService = {
  getCompletion: () => apiRequest<CountriesCompletion>("/countries"),
};
