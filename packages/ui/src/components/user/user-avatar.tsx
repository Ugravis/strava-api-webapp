import { Avatar, AvatarFallback, AvatarImage } from "@kilotrace/ui/components/ui/avatar";
import { avatarColorOf, initialsOf } from "@kilotrace/ui/lib/avatar";
import { publicNameOf } from "@kilotrace/ui/lib/user";
import { cn } from "@kilotrace/ui/lib/utils";

interface UserAvatarProps {
  user: { displayName: string | null; username: string; avatarUrl: string | null };
  className?: string;
  fallbackClassName?: string;
}

/** Profile picture, or generated initials when there is none. */
export function UserAvatar({ user, className, fallbackClassName }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {user.avatarUrl && (
        <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
      )}
      <AvatarFallback
        className={cn(
          // Kept white whatever the parent sets, e.g. a menu item on focus.
          "font-medium text-white!",
          avatarColorOf(user.username),
          fallbackClassName,
        )}
      >
        {initialsOf(publicNameOf(user))}
      </AvatarFallback>
    </Avatar>
  );
}
