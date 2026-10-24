import { apiRequest } from "@/lib/api/client";
import type { FollowDirection, FollowStatus, FollowsSummary, ProfileSummary, PublicProfile } from "@/lib/api/types";

const profilePath = (username: string) => `/profiles/${encodeURIComponent(username)}`;

/** Users per page of followers or followed users. */
export const FOLLOWS_PAGE_SIZE = 30;

export const profilesService = {
  search: (query: string) => apiRequest<ProfileSummary[]>(`/profiles?q=${encodeURIComponent(query)}`),
  get: (username: string) => apiRequest<PublicProfile>(profilePath(username)),
  /** Follows a public profile, or asks to follow a private one. */
  follow: (username: string) => apiRequest<{ status: FollowStatus }>(`${profilePath(username)}/follow`, { method: "PUT" }),
  unfollow: (username: string) => apiRequest(`${profilePath(username)}/follow`, { method: "DELETE" }),
  like: (username: string) => apiRequest(`${profilePath(username)}/like`, { method: "PUT" }),
  unlike: (username: string) => apiRequest(`${profilePath(username)}/like`, { method: "DELETE" }),
  acceptFollower: (username: string) => apiRequest(`${profilePath(username)}/follower`, { method: "PUT" }),
  /** Removes a follower of the current user, or declines their request. */
  removeFollower: (username: string) => apiRequest(`${profilePath(username)}/follower`, { method: "DELETE" }),
  /** Users asking to follow the current one, after the `offset` latest ones. */
  requests: (offset: number) => apiRequest<ProfileSummary[]>(`/profiles/me/requests?offset=${offset}`),
  /** Users the current one asked to follow, not accepted yet, after the `offset` latest ones. */
  sentRequests: (offset: number) => apiRequest<ProfileSummary[]>(`/profiles/me/sent-requests?offset=${offset}`),
  summary: () => apiRequest<FollowsSummary>("/profiles/me/summary"),
  setPrivacy: (isPrivate: boolean) =>
    apiRequest("/profiles/me/privacy", { method: "PUT", body: { json: { private: isPrivate } } }),
  /** Followers of the user, or the users they follow, after the `offset` latest ones. */
  list: (username: string, direction: FollowDirection, offset: number) =>
    apiRequest<ProfileSummary[]>(`${profilePath(username)}/${direction}?offset=${offset}`),
};
