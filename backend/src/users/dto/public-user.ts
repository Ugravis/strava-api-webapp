import type { User } from '../user.entity';
import { avatarUrlFor } from './user-response';

/** What any signed-in user may see of another one: never the email. */
export interface PublicUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: avatarUrlFor(user),
  };
}
