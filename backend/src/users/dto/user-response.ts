import type { User } from '../user.entity';

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
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
    hasPassword: user.passwordHash !== null,
    createdAt: user.createdAt.toISOString(),
  };
}
