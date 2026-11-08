import { type AdminRole, highestAdminRole } from '@kilotrace/shared/admin';
import type { FavoriteSport } from '../favorite-sports';
import type { User } from '../user.entity';

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  countryCode: string | null;
  favoriteSports: FavoriteSport[];
  profileColor: string | null;
  profilePrivate: boolean;
  hasPassword: boolean;
  /** Highest back-office role, null outside the team: only shows the way to the back office. */
  adminRole: AdminRole | null;
  createdAt: string;
}

export function avatarUrlFor(user: User): string | null {
  if (user.avatarKey) {
    return `/api/${user.avatarKey}`;
  }
  return user.externalAvatarUrl;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: avatarUrlFor(user),
    bio: user.bio,
    city: user.city,
    countryCode: user.countryCode,
    favoriteSports: user.favoriteSports,
    profileColor: user.profileColor,
    profilePrivate: user.profilePrivate,
    hasPassword: user.passwordHash !== null,
    adminRole: highestAdminRole(user.roles ?? []),
    createdAt: user.createdAt.toISOString(),
  };
}
