import type { AuditUser } from '@kilotrace/shared/admin';
import { avatarUrlFor } from '../../users/dto/user-response';
import type { User } from '../../users/user.entity';

/** A user named in the back office; only the id is left of a deleted one. */
export function toAuditUser(id: string, user: User | undefined): AuditUser {
  return {
    id,
    username: user?.username ?? null,
    displayName: user?.displayName ?? null,
    avatarUrl: user ? avatarUrlFor(user) : null,
  };
}
