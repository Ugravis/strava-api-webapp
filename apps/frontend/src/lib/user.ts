/** Name shown for a user: the display name when set, the username otherwise. */
export function publicNameOf(user: { displayName: string | null; username: string }): string {
  return user.displayName?.trim() || user.username;
}
