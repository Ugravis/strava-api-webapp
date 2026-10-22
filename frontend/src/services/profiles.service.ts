import { apiRequest } from "@/lib/api/client";
import type { FollowDirection, ProfileSummary, PublicProfile } from "@/lib/api/types";

const profilePath = (username: string) => `/profiles/${encodeURIComponent(username)}`;

/** Users per page of followers or followed users. */
export const FOLLOWS_PAGE_SIZE = 30;

export const profilesService = {
  search: (query: string) => apiRequest<ProfileSummary[]>(`/profiles?q=${encodeURIComponent(query)}`),
  get: (username: string) => apiRequest<PublicProfile>(profilePath(username)),
  follow: (username: string) => apiRequest(`${profilePath(username)}/follow`, { method: "PUT" }),
  unfollow: (username: string) => apiRequest(`${profilePath(username)}/follow`, { method: "DELETE" }),
  /** Followers of the user, or the users they follow, after the `offset` latest ones. */
  list: (username: string, direction: FollowDirection, offset: number) =>
    apiRequest<ProfileSummary[]>(`${profilePath(username)}/${direction}?offset=${offset}`),
};
