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
  favoriteSports: FavoriteSport[];
  profileColor: string | null;
  profilePrivate: boolean;
  hasPassword: boolean;
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
    favoriteSports: user.favoriteSports,
    profileColor: user.profileColor,
    profilePrivate: user.profilePrivate,
    hasPassword: user.passwordHash !== null,
    createdAt: user.createdAt.toISOString(),
  };
}
