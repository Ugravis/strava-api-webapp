import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarColorOf, initialsOf } from "@/lib/avatar";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";

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
          "font-medium text-white",
          avatarColorOf(user.username),
          fallbackClassName,
        )}
      >
        {initialsOf(publicNameOf(user))}
      </AvatarFallback>
    </Avatar>
  );
}
